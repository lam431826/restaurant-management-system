-- standardWorkdayMinutes never fed payroll (no "Theo ngày công chuẩn" salary type reads
-- workCredit) — settings-only dead weight. Half-day (BR-AT-08) and workCredit itself stay;
-- the "full day" credit denominator is now a fixed 480-minute constant in AttendanceCalculator.

-- SQL Server auto-names the DEFAULT constraint on this column; it must be dropped before
-- the column itself, and its name isn't known statically.
DECLARE @constraintName NVARCHAR(200);
SELECT @constraintName = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID('attendance_settings') AND c.name = 'standard_workday_minutes';

IF @constraintName IS NOT NULL
    EXEC('ALTER TABLE attendance_settings DROP CONSTRAINT ' + @constraintName);

ALTER TABLE attendance_settings DROP COLUMN standard_workday_minutes;
