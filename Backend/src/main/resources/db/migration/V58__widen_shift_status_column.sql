-- V58: widen shifts.status to fit the new PENDING_MANAGER_CONFIRM value (23 chars).
-- ux_shifts_open_per_cashier (V34) is a filtered index on this column, so it must be
-- dropped before the ALTER and recreated after.

DROP INDEX ux_shifts_open_per_cashier ON shifts;

ALTER TABLE shifts ALTER COLUMN status NVARCHAR(30) NOT NULL;

CREATE UNIQUE INDEX ux_shifts_open_per_cashier
    ON shifts(cashier_id)
    WHERE status = 'OPEN';
