-- V41: Tracks when a table became OCCUPIED without a reservation (walk-in check-in or a
-- staff-created order on an AVAILABLE table). Used to block assigning a new reservation to
-- this table until the walk-in's dining (90 min) + cleaning (30 min) window has elapsed.
-- NULL for reservation-driven occupancy (ReservationServiceImpl.checkIn/transferTable never
-- set it) and cleared whenever the table frees back up.
IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('restaurant_tables') AND name = 'occupied_since')
    ALTER TABLE restaurant_tables ADD occupied_since DATETIME2;
