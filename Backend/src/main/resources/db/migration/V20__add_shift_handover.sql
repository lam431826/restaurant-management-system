-- V20: Add handover_amount to shifts (BR-CS-09)
IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('shifts') AND name = 'handover_amount')
    ALTER TABLE shifts ADD handover_amount DECIMAL(12, 0);
