-- V44: add nullable `code` columns to orders and invoices, in preparation for
-- persistent, human-readable business codes (Orders "DH000001", Invoices "HD000001"),
-- mirroring the existing Employee "NV000001" format.
--
-- Deliberately split from the migration that backfills/constrains these columns (V45):
-- SQL Server performs a single compile-time binding pass over an entire batch, so a
-- column added by ALTER TABLE cannot be referenced by a plain statement later in the
-- SAME batch even though it exists by the time that statement actually runs (the same
-- limitation documented in V35's paid_at backfill). Keeping the ADD in its own migration
-- file means it is a separate, already-committed batch by the time V45 references `code`,
-- so no EXEC()-deferred dynamic SQL is needed there.

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('orders') AND name = 'code')
    ALTER TABLE orders ADD code NVARCHAR(20) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('invoices') AND name = 'code')
    ALTER TABLE invoices ADD code NVARCHAR(20) NULL;
