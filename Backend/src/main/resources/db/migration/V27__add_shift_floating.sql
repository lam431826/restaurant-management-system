-- V27: BR-CS-18/19 — floating shift support. A floating shift (shift_type='FLOATING')
-- is opened by a helper cashier covering for a main shift's owner; it has opening_cash=0
-- and is later MERGED into the main shift (merged_into_shift_id points at it).
IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('shifts') AND name = 'shift_type')
    ALTER TABLE shifts ADD shift_type NVARCHAR(20) NOT NULL CONSTRAINT df_shifts_shift_type DEFAULT 'NORMAL';

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('shifts') AND name = 'merged_into_shift_id')
    ALTER TABLE shifts ADD merged_into_shift_id NVARCHAR(36);

EXEC(N'UPDATE shifts SET shift_type = ''NORMAL'' WHERE shift_type IS NULL');
