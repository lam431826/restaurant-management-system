-- V24: BR-CS-14 business-day cutoff. A cash shift (and its revenue) rolls up to a
-- business_date defined by a configurable cutoff (default 05:00), not calendar
-- midnight. A shift opened at 22:00 and closed at 02:00 stays on the evening's date.
IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('shifts') AND name = 'business_date')
    ALTER TABLE shifts ADD business_date DATE;

-- Backfill existing rows using the default 05:00 cutoff. EXEC defers compilation so
-- the freshly added column resolves without a GO batch separator.
EXEC(N'UPDATE shifts
          SET business_date = CASE
                WHEN CAST(opened_at AS TIME) < ''05:00''
                    THEN CAST(DATEADD(DAY, -1, opened_at) AS DATE)
                ELSE CAST(opened_at AS DATE)
          END
        WHERE business_date IS NULL');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_shifts_business_date')
    CREATE INDEX ix_shifts_business_date ON shifts(business_date);
