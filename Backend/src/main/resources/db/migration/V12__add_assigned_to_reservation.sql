-- V12: Add assigned_to field to reservations (staff responsible for the reservation)

ALTER TABLE reservations ADD assigned_to NVARCHAR(36);

ALTER TABLE reservations
    ADD CONSTRAINT fk_res_assigned FOREIGN KEY (assigned_to) REFERENCES users(id);

CREATE INDEX idx_res_assigned ON reservations(assigned_to);
