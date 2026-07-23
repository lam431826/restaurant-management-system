-- V59: Reports configuration singleton (Thiết lập báo cáo).
-- Drives the End-of-Day Report's default time-window upper bound; nothing else consumes it.

CREATE TABLE report_settings (
    id                              NVARCHAR(36) NOT NULL PRIMARY KEY,
    custom_revenue_window_enabled   BIT          NOT NULL DEFAULT 1,
    revenue_cutoff_time             TIME         NOT NULL DEFAULT '00:00:00',
    created_at                      DATETIME2,
    updated_at                      DATETIME2
);

INSERT INTO report_settings (id, created_at, updated_at)
VALUES ('d0000000-0000-0000-0000-000000000001', SYSUTCDATETIME(), SYSUTCDATETIME());
