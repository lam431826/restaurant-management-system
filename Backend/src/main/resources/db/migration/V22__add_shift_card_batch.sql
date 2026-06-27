-- V22: Add card_batch_total to shifts (BR-CS-12)
-- Optional card POS batch total entered at close as an informational cross-check.
-- Never produces a discrepancy and never blocks closing.
IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('shifts') AND name = 'card_batch_total')
    ALTER TABLE shifts ADD card_batch_total DECIMAL(12, 0);
