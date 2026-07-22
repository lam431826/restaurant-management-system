-- V50: backfill invoices.created_by from the existing audit trail, in its own batch after
-- V49 already committed the column addition.
--
-- generate() has always called audit("INVOICE_GENERATE", ...), which independently captured
-- the actor in audit_logs. Historical split/merge invoices have no audit trail to backfill
-- from and correctly stay NULL.

UPDATE i
SET i.created_by = al.actor_username
FROM invoices i
JOIN (
    SELECT target_id, actor_username,
           ROW_NUMBER() OVER (PARTITION BY target_id ORDER BY created_at ASC) AS rn
    FROM audit_logs
    WHERE target_entity = 'Invoice' AND action = 'INVOICE_GENERATE'
) al ON al.target_id = i.id AND al.rn = 1
WHERE i.created_by IS NULL;
