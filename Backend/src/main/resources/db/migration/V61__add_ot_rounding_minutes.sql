-- Round-down-to-block OT pay: otMinutes actually worked is rounded DOWN to the nearest
-- multiple of ot_rounding_minutes before being converted to decimal hours (/60.0) for pay.
-- E.g. ot_rounding_minutes=15: 29 actual OT minutes -> floor(29/15)*15 = 15min -> 0.25h paid;
-- 30 actual OT minutes -> 30min -> 0.5h paid. Default 1 = no rounding (every actual minute
-- pays proportionally), matching prior behavior exactly until a manager changes it.
ALTER TABLE attendance_settings ADD ot_rounding_minutes INT NOT NULL CONSTRAINT DF_attendance_settings_ot_rounding_minutes DEFAULT 1;
