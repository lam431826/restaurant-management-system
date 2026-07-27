-- Simplify overtime settings: replace the 4 separate before/after enabled + minimum-minutes
-- fields (BR-AT-10's "beyond a minimum threshold" gating) with a single overtime_enabled flag.
-- When enabled, ALL time outside the shift window counts as OT (no minimum), expressed in
-- decimal hours (otMinutes / 60.0) by the existing payroll OT formula (SalaryCalculator),
-- which already worked this way -- only the attendance-side gating is simplified here.

ALTER TABLE attendance_settings ADD overtime_enabled BIT NOT NULL CONSTRAINT DF_attendance_settings_overtime_enabled DEFAULT 1;
GO

UPDATE attendance_settings SET overtime_enabled = CASE WHEN ot_before_enabled = 1 OR ot_after_enabled = 1 THEN 1 ELSE 0 END;
GO

-- SQL Server auto-names the DEFAULT constraints on these 4 columns; each must be dropped
-- before the column itself, and the names aren't known statically.
DECLARE @c1 NVARCHAR(200), @c2 NVARCHAR(200), @c3 NVARCHAR(200), @c4 NVARCHAR(200);
SELECT @c1 = dc.name FROM sys.default_constraints dc JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id WHERE dc.parent_object_id = OBJECT_ID('attendance_settings') AND c.name = 'ot_before_enabled';
SELECT @c2 = dc.name FROM sys.default_constraints dc JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id WHERE dc.parent_object_id = OBJECT_ID('attendance_settings') AND c.name = 'ot_before_min_minutes';
SELECT @c3 = dc.name FROM sys.default_constraints dc JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id WHERE dc.parent_object_id = OBJECT_ID('attendance_settings') AND c.name = 'ot_after_enabled';
SELECT @c4 = dc.name FROM sys.default_constraints dc JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id WHERE dc.parent_object_id = OBJECT_ID('attendance_settings') AND c.name = 'ot_after_min_minutes';

IF @c1 IS NOT NULL EXEC('ALTER TABLE attendance_settings DROP CONSTRAINT ' + @c1);
IF @c2 IS NOT NULL EXEC('ALTER TABLE attendance_settings DROP CONSTRAINT ' + @c2);
IF @c3 IS NOT NULL EXEC('ALTER TABLE attendance_settings DROP CONSTRAINT ' + @c3);
IF @c4 IS NOT NULL EXEC('ALTER TABLE attendance_settings DROP CONSTRAINT ' + @c4);
GO

ALTER TABLE attendance_settings DROP COLUMN ot_before_enabled, ot_before_min_minutes, ot_after_enabled, ot_after_min_minutes;
