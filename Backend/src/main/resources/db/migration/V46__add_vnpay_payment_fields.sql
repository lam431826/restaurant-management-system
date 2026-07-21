-- V46: VNPAY Sandbox payment gateway fields.
--
-- Reuses the existing `payments` table/lifecycle (PENDING -> PAID/CANCELLED, one row per
-- gateway attempt) rather than a new entity: it already safely represents gateway retries
-- (existing gateway_ref + expires_at, the same shape the mock QR gateway uses) and duplicate
-- callbacks (row-level pessimistic locking already used elsewhere in this codebase). Only the
-- VNPAY-specific response fields are new.
--
-- gateway_ref carries the merchant transaction reference (vnp_TxnRef); it must be unique so
-- Return/IPN can look up the attempt unambiguously and duplicate calls stay idempotent.
-- Filtered because CASH rows never set gateway_ref.

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('payments') AND name = 'vnp_transaction_no')
    ALTER TABLE payments ADD vnp_transaction_no NVARCHAR(50) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('payments') AND name = 'vnp_response_code')
    ALTER TABLE payments ADD vnp_response_code NVARCHAR(10) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('payments') AND name = 'vnp_transaction_status')
    ALTER TABLE payments ADD vnp_transaction_status NVARCHAR(10) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('payments') AND name = 'vnp_bank_code')
    ALTER TABLE payments ADD vnp_bank_code NVARCHAR(50) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('payments') AND name = 'vnp_card_type')
    ALTER TABLE payments ADD vnp_card_type NVARCHAR(50) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'uq_payments_gateway_ref' AND object_id = OBJECT_ID('payments'))
    CREATE UNIQUE INDEX uq_payments_gateway_ref ON payments(gateway_ref) WHERE gateway_ref IS NOT NULL;
