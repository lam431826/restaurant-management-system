-- V14: Indexes for time-window conflict queries and overbooking checks.
-- checkTableAvailability uses (table_id, datetime) to detect schedule overlaps.
-- countActiveInWindow uses (status, datetime) for public-booking capacity checks.

CREATE NONCLUSTERED INDEX IX_reservations_table_datetime
ON reservations (table_id, datetime)
INCLUDE (status, id);

CREATE NONCLUSTERED INDEX IX_reservations_status_datetime
ON reservations (status, datetime);
