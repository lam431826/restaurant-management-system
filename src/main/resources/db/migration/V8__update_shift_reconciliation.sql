<<<<<<< HEAD
-- V8: Shift Reconciliation – per-payment-method tracking, operator audit, manager close

-- Add closed_by and closing_note to shifts
=======
-- V8: Add reconciliation fields and shift_payment_reconciliations table

>>>>>>> origin/develop
ALTER TABLE shifts
    ADD closed_by    NVARCHAR(36),
        closing_note NVARCHAR(500);

ALTER TABLE shifts
    ADD CONSTRAINT fk_shift_closed_by FOREIGN KEY (closed_by) REFERENCES users(id);

<<<<<<< HEAD
-- Add operator_id to shift_cash_movements for audit (BR-CASH-06)
=======
>>>>>>> origin/develop
ALTER TABLE shift_cash_movements
    ADD operator_id NVARCHAR(36);

ALTER TABLE shift_cash_movements
    ADD CONSTRAINT fk_scm_operator FOREIGN KEY (operator_id) REFERENCES users(id);

<<<<<<< HEAD
-- Per-method reconciliation table (BR-CLOSE-02, BR-CLOSE-03, BR-CLOSE-04)
CREATE TABLE shift_payment_reconciliations (
    id              NVARCHAR(36)   NOT NULL PRIMARY KEY,
    shift_id        NVARCHAR(36)   NOT NULL,
    payment_method  NVARCHAR(20)   NOT NULL,
    expected_amount DECIMAL(12, 0) NOT NULL DEFAULT 0,
    actual_amount   DECIMAL(12, 0) NOT NULL DEFAULT 0,
    variance        DECIMAL(12, 0) NOT NULL DEFAULT 0,
    CONSTRAINT fk_spr_shift FOREIGN KEY (shift_id) REFERENCES shifts(id),
=======
CREATE TABLE shift_payment_reconciliations (
    id             NVARCHAR(36)   NOT NULL PRIMARY KEY,
    shift_id       NVARCHAR(36)   NOT NULL,
    payment_method NVARCHAR(20)   NOT NULL,
    expected_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
    actual_amount   DECIMAL(12,0) NOT NULL DEFAULT 0,
    variance        DECIMAL(12,0) NOT NULL DEFAULT 0,
    CONSTRAINT fk_spr_shift       FOREIGN KEY (shift_id) REFERENCES shifts(id),
>>>>>>> origin/develop
    CONSTRAINT uq_spr_shift_method UNIQUE (shift_id, payment_method)
);

CREATE INDEX idx_spr_shift ON shift_payment_reconciliations(shift_id);
