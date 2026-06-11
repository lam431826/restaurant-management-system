-- V7: Notification Logs

CREATE TABLE notification_logs (
    id            NVARCHAR(36)  NOT NULL PRIMARY KEY,
    type          NVARCHAR(50)  NOT NULL,
    channel       NVARCHAR(10)  NOT NULL,
    recipient     NVARCHAR(200) NOT NULL,
    template      NVARCHAR(100),
    status        NVARCHAR(20)  NOT NULL DEFAULT 'pending',
    error_message NVARCHAR(500),
    sent_at       DATETIME2
);

CREATE INDEX idx_notif_recipient ON notification_logs(recipient);
CREATE INDEX idx_notif_status    ON notification_logs(status);
CREATE INDEX idx_notif_sent      ON notification_logs(sent_at);
