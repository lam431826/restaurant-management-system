-- V49: add nullable invoices.created_by, in its own batch so the backfill in V50 can
-- reference it directly — same SQL Server compile-time binding limitation as V44/V45
-- (a column added by ALTER TABLE cannot be referenced later in the SAME batch even though
-- it exists by the time that statement actually runs).

ALTER TABLE invoices ADD created_by NVARCHAR(150) NULL;
