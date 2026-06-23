-- V11: Table management — extra fields + areas (zones)

ALTER TABLE restaurant_tables ADD
    note          NVARCHAR(255),
    display_order INT NOT NULL DEFAULT 0,
    active        BIT NOT NULL DEFAULT 1;

CREATE TABLE table_areas (
    id            NVARCHAR(36)  NOT NULL PRIMARY KEY,
    name          NVARCHAR(50)  NOT NULL UNIQUE,
    note          NVARCHAR(255),
    display_order INT           NOT NULL DEFAULT 0
);
