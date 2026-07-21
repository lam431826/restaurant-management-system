-- V45: backfill `code` for existing orders/invoices (oldest first, deterministic), then
-- enforce NOT NULL + uniqueness, then create the concurrency-safe generation sequences.
--
-- Runs entirely in its own migration file/batch, after V44 added the nullable `code`
-- columns in a separate, already-committed batch — so the plain UPDATE/ALTER/SELECT
-- statements below can reference `code` directly with no dynamic-SQL deferral needed.

-- 1. Backfill, ranked by creation order via a correlated count (avoids a CTE so the
-- statement stays a single, simple UPDATE).
UPDATE o
SET o.code = 'DH' + RIGHT('000000' + CAST(
        (SELECT COUNT(*) FROM orders o2
         WHERE o2.created_at < o.created_at
            OR (o2.created_at = o.created_at AND o2.id <= o.id))
        AS VARCHAR(10)), 6)
FROM orders o
WHERE o.code IS NULL;

UPDATE i
SET i.code = 'HD' + RIGHT('000000' + CAST(
        (SELECT COUNT(*) FROM invoices i2
         WHERE i2.created_at < i.created_at
            OR (i2.created_at = i.created_at AND i2.id <= i.id))
        AS VARCHAR(10)), 6)
FROM invoices i
WHERE i.code IS NULL;

-- 2. Enforce NOT NULL + uniqueness now that every row has a code.
IF EXISTS (SELECT 1 FROM sys.columns
           WHERE object_id = OBJECT_ID('orders') AND name = 'code' AND is_nullable = 1)
    ALTER TABLE orders ALTER COLUMN code NVARCHAR(20) NOT NULL;

IF EXISTS (SELECT 1 FROM sys.columns
           WHERE object_id = OBJECT_ID('invoices') AND name = 'code' AND is_nullable = 1)
    ALTER TABLE invoices ALTER COLUMN code NVARCHAR(20) NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'uq_orders_code' AND object_id = OBJECT_ID('orders'))
    CREATE UNIQUE INDEX uq_orders_code ON orders(code);

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'uq_invoices_code' AND object_id = OBJECT_ID('invoices'))
    CREATE UNIQUE INDEX uq_invoices_code ON invoices(code);

-- 3. Concurrency-safe code generation sequences (see BusinessCodeGenerator). NEXT VALUE
-- FOR is atomic and never returns the same value twice to concurrent callers, regardless
-- of transaction isolation, with no application-level locking required — unlike
-- Employee's own generateNextCode(), which computes MAX(existing)+1 in application code.
IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'order_code_seq')
    CREATE SEQUENCE dbo.order_code_seq AS BIGINT START WITH 1 INCREMENT BY 1 NO CACHE;

IF NOT EXISTS (SELECT 1 FROM sys.sequences WHERE name = 'invoice_code_seq')
    CREATE SEQUENCE dbo.invoice_code_seq AS BIGINT START WITH 1 INCREMENT BY 1 NO CACHE;

-- 4. Fast-forward each sequence past every backfilled code so the next generated code
-- never collides with history. ALTER SEQUENCE ... RESTART WITH requires a literal, so
-- the computed value is spliced into dynamic SQL rather than bound as a parameter.
-- The concatenated text is built into a variable before EXEC(): SQL Server's EXEC(...)
-- dynamic-SQL form does not parse a CAST(...) call combined via `+` directly inline
-- (raises "Incorrect syntax near 'CAST'" even though the same expression is valid once
-- assigned to a variable first).
DECLARE @nextOrderSeq BIGINT;
SELECT @nextOrderSeq = ISNULL(MAX(TRY_CAST(SUBSTRING(code, 3, 18) AS BIGINT)), 0) + 1 FROM orders;
DECLARE @orderSeqSql NVARCHAR(200) = N'ALTER SEQUENCE dbo.order_code_seq RESTART WITH ' + CAST(@nextOrderSeq AS NVARCHAR(20));
EXEC(@orderSeqSql);

DECLARE @nextInvoiceSeq BIGINT;
SELECT @nextInvoiceSeq = ISNULL(MAX(TRY_CAST(SUBSTRING(code, 3, 18) AS BIGINT)), 0) + 1 FROM invoices;
DECLARE @invoiceSeqSql NVARCHAR(200) = N'ALTER SEQUENCE dbo.invoice_code_seq RESTART WITH ' + CAST(@nextInvoiceSeq AS NVARCHAR(20));
EXEC(@invoiceSeqSql);
