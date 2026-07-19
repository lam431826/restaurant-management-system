-- V34: Enforce BR-CS-01 at the DB level — a cashier may have at most one OPEN
-- cash shift at a time. A filtered unique index permits unlimited non-OPEN rows
-- (CLOSED / PENDING_RECON / etc.) while blocking a second concurrent OPEN row.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_shifts_open_per_cashier')
    CREATE UNIQUE INDEX ux_shifts_open_per_cashier
        ON shifts(cashier_id)
        WHERE status = 'OPEN';
