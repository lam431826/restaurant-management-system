-- V8: Add reconciliation fields and shift_payment_reconciliations table

ALTER TABLE shifts
    ADD closed_by    NVARCHAR(36),
        closing_note NVARCHAR(500);

ALTER TABLE shifts
    ADD CONSTRAINT fk_shift_closed_by FOREIGN KEY (closed_by) REFERENCES users(id);

ALTER TABLE shift_cash_movements
    ADD operator_id NVARCHAR(36);

ALTER TABLE shift_cash_movements
    ADD CONSTRAINT fk_scm_operator FOREIGN KEY (operator_id) REFERENCES users(id);

CREATE TABLE shift_payment_reconciliations (
    id             NVARCHAR(36)   NOT NULL PRIMARY KEY,
    shift_id       NVARCHAR(36)   NOT NULL,
    payment_method NVARCHAR(20)   NOT NULL,
    expected_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
    actual_amount   DECIMAL(12,0) NOT NULL DEFAULT 0,
    variance        DECIMAL(12,0) NOT NULL DEFAULT 0,
    CONSTRAINT fk_spr_shift       FOREIGN KEY (shift_id) REFERENCES shifts(id),
    CONSTRAINT uq_spr_shift_method UNIQUE (shift_id, payment_method)
);

CREATE INDEX idx_spr_shift ON shift_payment_reconciliations(shift_id);
