-- Revert V12: remove assigned_to field (design decision: use audit log instead)
ALTER TABLE reservations DROP CONSTRAINT fk_res_assigned;
DROP INDEX idx_res_assigned ON reservations;
ALTER TABLE reservations DROP COLUMN assigned_to;
