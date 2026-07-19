-- V35: Payment Methods feature (CASH change tracking + simulated QR external payment).
-- Existing payments.gateway_ref is reused as the QR transaction reference; existing
-- payments.status (plain NVARCHAR, no CHECK constraint) starts also carrying PENDING
-- and CANCELLED alongside the existing PAID.
IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('payments') AND name = 'received_amount')
    ALTER TABLE payments ADD received_amount DECIMAL(12, 0);

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('payments') AND name = 'change_amount')
    ALTER TABLE payments ADD change_amount DECIMAL(12, 0);

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('payments') AND name = 'expires_at')
    ALTER TABLE payments ADD expires_at DATETIME2;

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('payments') AND name = 'paid_at')
    ALTER TABLE payments ADD paid_at DATETIME2;

-- Backfill paid_at for existing PAID rows so historical data stays consistent
-- (created_at is the only timestamp that existed before this column).
-- Dynamic SQL: the whole script is one batch, so a plain UPDATE referencing
-- paid_at is compile-time bound against the pre-ALTER schema and fails with
-- "Invalid column name 'paid_at'" even though the column exists by the time
-- this statement actually runs. EXEC() defers parsing to execution time.
IF COL_LENGTH('payments', 'paid_at') IS NOT NULL
BEGIN
    EXEC(N'
        UPDATE payments
        SET paid_at = created_at
        WHERE status = ''PAID''
          AND paid_at IS NULL
    ');
END
