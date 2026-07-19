-- V25: BR-WS-11 — capture a reason on early clock-out. (EARLY_LEAVE / MISSING_CLOCKOUT
-- are new AttendanceStatus values stored in the existing status column, no schema change.)
IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('roster_attendance') AND name = 'clock_out_reason')
    ALTER TABLE roster_attendance ADD clock_out_reason NVARCHAR(500);
