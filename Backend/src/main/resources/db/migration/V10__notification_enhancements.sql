-- V10: Add guest_email + reminder_sent to reservations; add reference tracking to notification_logs

ALTER TABLE reservations ADD guest_email  NVARCHAR(150) NULL;
ALTER TABLE reservations ADD reminder_sent BIT           NOT NULL DEFAULT 0;

ALTER TABLE notification_logs ADD reference_id   NVARCHAR(36) NULL;
ALTER TABLE notification_logs ADD reference_type NVARCHAR(50) NULL;

CREATE INDEX idx_notif_ref ON notification_logs(reference_id);
