-- V33: Drop the legacy self-service roster module (superseded — being redesigned).
-- Tables originally created in V19__create_roster.sql (+ V25 column addition).
-- Drop order respects FK dependencies: requests -> attendance -> assignments -> templates; week_publications has no FK.

DROP TABLE roster_requests;
DROP TABLE roster_attendance;
DROP TABLE roster_assignments;
DROP TABLE roster_shift_templates;
DROP TABLE roster_week_publications;
