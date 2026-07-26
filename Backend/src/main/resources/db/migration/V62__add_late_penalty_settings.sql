-- Automatic wage deduction for late arrival / early leave (SHIFT-type salary only, mirroring
-- BR-PAY-05's OT restriction -- FIXED ignores attendance per BR-PAY-03, HOURLY already pays
-- strictly by workedMinutes so lateness already reduces its pay naturally).
--
-- Formula (deliberately rounds UP, always at least one block, even on an exact multiple):
--   penaltyHours = (floor(lateOrEarlyMinutes / late_penalty_rounding_minutes) + 1)
--                  * late_penalty_rounding_minutes / 60.0
-- e.g. rounding=15: 1 actual late minute -> 1 block -> 0.25h deducted; 16 minutes -> 2 blocks
-- -> 0.5h deducted. Applied separately to late and early-leave minutes, summed.
ALTER TABLE attendance_settings ADD
    late_penalty_enabled BIT NOT NULL CONSTRAINT DF_attendance_settings_late_penalty_enabled DEFAULT 0,
    late_penalty_rounding_minutes INT NOT NULL CONSTRAINT DF_attendance_settings_late_penalty_rounding_minutes DEFAULT 15;
