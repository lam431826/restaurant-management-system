-- V57: "Kết ca" configuration singleton (exactly one row, seeded below).

CREATE TABLE shift_settings (
    id                       NVARCHAR(36) NOT NULL PRIMARY KEY,
    shift_closing_required   BIT          NOT NULL DEFAULT 1,
    manager_confirm_closing  BIT          NOT NULL DEFAULT 0,
    created_at               DATETIME2,
    updated_at               DATETIME2
);

INSERT INTO shift_settings (id, shift_closing_required, manager_confirm_closing, created_at, updated_at)
VALUES ('b0000000-0000-0000-0000-000000000001', 1, 0, SYSUTCDATETIME(), SYSUTCDATETIME());
