-- V36: Optional customer contact captured on an order, so the receipt and the
-- "send invoice" action use real data instead of placeholders.
-- All columns are nullable: a walk-in order legitimately has no customer details,
-- and existing rows must stay valid under ddl-auto=validate.
IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('orders') AND name = 'customer_name')
    ALTER TABLE orders ADD customer_name NVARCHAR(150);

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('orders') AND name = 'customer_phone')
    ALTER TABLE orders ADD customer_phone NVARCHAR(20);

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('orders') AND name = 'customer_email')
    ALTER TABLE orders ADD customer_email NVARCHAR(150);
