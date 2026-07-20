-- Add Invoice Split lifecycle metadata without changing existing financial data.

IF OBJECT_ID(N'dbo.invoices', N'U') IS NULL
BEGIN
    THROW 51023, 'Invoice split lifecycle migration aborted: invoices table is missing.', 1;
END;

IF COL_LENGTH(N'dbo.invoices', N'split_from_invoice_id') IS NULL
BEGIN
    EXEC sys.sp_executesql N'
        ALTER TABLE dbo.invoices
        ADD split_from_invoice_id NVARCHAR(36) NULL;
    ';
END;
ELSE IF EXISTS (
    SELECT 1
    FROM sys.columns c
    JOIN sys.types t ON t.user_type_id = c.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.invoices')
      AND c.name = N'split_from_invoice_id'
      AND (t.name <> N'nvarchar' OR c.max_length <> 72 OR c.is_nullable <> 1)
)
BEGIN
    THROW 51024, 'Invoice split lifecycle migration aborted: split_from_invoice_id has an incompatible definition.', 1;
END;

IF EXISTS (
    SELECT 1
    FROM dbo.invoices
    WHERE status NOT IN (N'ACTIVE', N'MERGED', N'SPLIT')
       OR (status = N'MERGED' AND merged_into_invoice_id IS NULL)
       OR (status IN (N'ACTIVE', N'SPLIT') AND merged_into_invoice_id IS NOT NULL)
)
BEGIN
    THROW 51025, 'Invoice split lifecycle migration aborted: existing invoice lifecycle data is invalid.', 1;
END;

EXEC sys.sp_executesql N'
    IF EXISTS (
        SELECT 1
        FROM dbo.invoices
        WHERE split_from_invoice_id = id
    )
    BEGIN
        THROW 51026, ''Invoice split lifecycle migration aborted: an invoice references itself as its split source.'', 1;
    END;

    IF EXISTS (
        SELECT 1
        FROM dbo.invoices child_invoice
        LEFT JOIN dbo.invoices source_invoice
            ON source_invoice.id = child_invoice.split_from_invoice_id
        WHERE child_invoice.split_from_invoice_id IS NOT NULL
          AND source_invoice.id IS NULL
    )
    BEGIN
        THROW 51027, ''Invoice split lifecycle migration aborted: an invoice references a missing split source.'', 1;
    END;
';

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.invoices')
      AND name = N'ck_invoices_status'
)
BEGIN
    ALTER TABLE dbo.invoices DROP CONSTRAINT ck_invoices_status;
END;

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.invoices')
      AND name = N'ck_invoices_merge_lineage'
)
BEGIN
    ALTER TABLE dbo.invoices DROP CONSTRAINT ck_invoices_merge_lineage;
END;

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.invoices')
      AND name NOT IN (N'ck_invoices_no_self_merge', N'ck_invoices_no_self_split')
      AND (
          LOWER(definition) LIKE N'%status%'
          OR LOWER(definition) LIKE N'%merged_into_invoice_id%'
      )
)
BEGIN
    THROW 51028, 'Invoice split lifecycle migration aborted: an unexpected invoice lifecycle check constraint exists.', 1;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.invoices')
      AND name = N'ck_invoices_no_self_merge'
)
BEGIN
    THROW 51029, 'Invoice split lifecycle migration aborted: the existing no-self-merge constraint is missing.', 1;
END;

EXEC sys.sp_executesql N'
    ALTER TABLE dbo.invoices WITH CHECK ADD
        CONSTRAINT ck_invoices_status
            CHECK (status IN (N''ACTIVE'', N''MERGED'', N''SPLIT'')),
        CONSTRAINT ck_invoices_merge_lineage
            CHECK (
                (status = N''MERGED'' AND merged_into_invoice_id IS NOT NULL)
                OR (status IN (N''ACTIVE'', N''SPLIT'') AND merged_into_invoice_id IS NULL)
            );

    ALTER TABLE dbo.invoices CHECK CONSTRAINT ck_invoices_status;
    ALTER TABLE dbo.invoices CHECK CONSTRAINT ck_invoices_merge_lineage;
';

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.invoices')
      AND name = N'ck_invoices_no_self_split'
)
BEGIN
    ALTER TABLE dbo.invoices DROP CONSTRAINT ck_invoices_no_self_split;
END;

EXEC sys.sp_executesql N'
    ALTER TABLE dbo.invoices WITH CHECK ADD
        CONSTRAINT ck_invoices_no_self_split
            CHECK (split_from_invoice_id IS NULL OR split_from_invoice_id <> id);
    ALTER TABLE dbo.invoices CHECK CONSTRAINT ck_invoices_no_self_split;
';

IF EXISTS (
    SELECT 1
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
    JOIN sys.columns parent_column
        ON parent_column.object_id = fkc.parent_object_id
       AND parent_column.column_id = fkc.parent_column_id
    WHERE fk.parent_object_id = OBJECT_ID(N'dbo.invoices')
      AND parent_column.name = N'split_from_invoice_id'
      AND fk.name <> N'fk_invoices_split_from'
)
BEGIN
    THROW 51030, 'Invoice split lifecycle migration aborted: an unexpected split-source foreign key exists.', 1;
END;

IF EXISTS (
    SELECT 1
    FROM sys.foreign_keys fk
    WHERE fk.parent_object_id = OBJECT_ID(N'dbo.invoices')
      AND fk.name = N'fk_invoices_split_from'
      AND (
          fk.referenced_object_id <> OBJECT_ID(N'dbo.invoices')
          OR fk.delete_referential_action <> 0
          OR fk.update_referential_action <> 0
          OR (SELECT COUNT(*)
              FROM sys.foreign_key_columns
              WHERE constraint_object_id = fk.object_id) <> 1
          OR NOT EXISTS (
              SELECT 1
              FROM sys.foreign_key_columns fkc
              JOIN sys.columns parent_column
                  ON parent_column.object_id = fkc.parent_object_id
                 AND parent_column.column_id = fkc.parent_column_id
              JOIN sys.columns referenced_column
                  ON referenced_column.object_id = fkc.referenced_object_id
                 AND referenced_column.column_id = fkc.referenced_column_id
              WHERE fkc.constraint_object_id = fk.object_id
                AND parent_column.name = N'split_from_invoice_id'
                AND referenced_column.name = N'id'
          )
      )
)
BEGIN
    THROW 51031, 'Invoice split lifecycle migration aborted: fk_invoices_split_from has an incompatible definition.', 1;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'dbo.invoices')
      AND name = N'fk_invoices_split_from'
)
BEGIN
    EXEC sys.sp_executesql N'
        ALTER TABLE dbo.invoices WITH CHECK ADD
            CONSTRAINT fk_invoices_split_from
                FOREIGN KEY (split_from_invoice_id)
                REFERENCES dbo.invoices(id)
                ON DELETE NO ACTION
                ON UPDATE NO ACTION;
        ALTER TABLE dbo.invoices CHECK CONSTRAINT fk_invoices_split_from;
    ';
END;

IF EXISTS (
    SELECT 1
    FROM sys.indexes i
    WHERE i.object_id = OBJECT_ID(N'dbo.invoices')
      AND i.name = N'idx_invoices_split_from'
      AND (
          i.is_unique <> 0
          OR i.has_filter <> 0
          OR NOT EXISTS (
              SELECT 1
              FROM sys.index_columns ic
              JOIN sys.columns c
                  ON c.object_id = ic.object_id
                 AND c.column_id = ic.column_id
              WHERE ic.object_id = i.object_id
                AND ic.index_id = i.index_id
                AND ic.key_ordinal = 1
                AND c.name = N'split_from_invoice_id'
          )
          OR EXISTS (
              SELECT 1
              FROM sys.index_columns ic
              WHERE ic.object_id = i.object_id
                AND ic.index_id = i.index_id
                AND (ic.key_ordinal > 1 OR ic.is_included_column = 1)
          )
      )
)
BEGIN
    THROW 51032, 'Invoice split lifecycle migration aborted: idx_invoices_split_from has an incompatible definition.', 1;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.invoices')
      AND name = N'idx_invoices_split_from'
)
BEGIN
    EXEC sys.sp_executesql N'
        CREATE INDEX idx_invoices_split_from
            ON dbo.invoices(split_from_invoice_id);
    ';
END;
