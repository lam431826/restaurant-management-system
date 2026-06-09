-- V6: Shifts and Cash Movements

CREATE TABLE shifts (
    id            NVARCHAR(36)   NOT NULL PRIMARY KEY,
    cashier_id    NVARCHAR(36)   NOT NULL,
    opened_at     DATETIME2      NOT NULL DEFAULT SYSDATETIME(),
    closed_at     DATETIME2,
    opening_cash  DECIMAL(12, 0) NOT NULL DEFAULT 0,
    closing_cash  DECIMAL(12, 0),
    total_revenue DECIMAL(12, 0),
    status        NVARCHAR(20)   NOT NULL DEFAULT 'open',
    CONSTRAINT fk_shift_cashier FOREIGN KEY (cashier_id) REFERENCES users(id)
);

CREATE TABLE shift_cash_movements (
    id         NVARCHAR(36)   NOT NULL PRIMARY KEY,
    shift_id   NVARCHAR(36)   NOT NULL,
    type       NVARCHAR(10)   NOT NULL,
    amount     DECIMAL(12, 0) NOT NULL,
    reason     NVARCHAR(300),
    created_at DATETIME2,
    CONSTRAINT fk_scm_shift FOREIGN KEY (shift_id) REFERENCES shifts(id)
);

CREATE INDEX idx_shifts_cashier ON shifts(cashier_id);
CREATE INDEX idx_shifts_status  ON shifts(status);
CREATE INDEX idx_scm_shift      ON shift_cash_movements(shift_id);
