-- V2: Restaurant Tables and Reservations

CREATE TABLE restaurant_tables (
    id         NVARCHAR(36) NOT NULL PRIMARY KEY,
    name       NVARCHAR(20) NOT NULL UNIQUE,
    capacity   INT          NOT NULL,
    area       NVARCHAR(50),
    status     NVARCHAR(20) NOT NULL DEFAULT 'available',
    qr_token   NVARCHAR(200) UNIQUE,
    updated_at DATETIME2
);

CREATE TABLE reservations (
    id         NVARCHAR(36)  NOT NULL PRIMARY KEY,
    table_id   NVARCHAR(36),
    guest_name NVARCHAR(150) NOT NULL,
    phone      NVARCHAR(20)  NOT NULL,
    party_size INT           NOT NULL,
    datetime   DATETIME2     NOT NULL,
    note       NVARCHAR(500),
    status     NVARCHAR(20)  NOT NULL DEFAULT 'pending',
    created_by NVARCHAR(36),
    created_at DATETIME2,
    updated_at DATETIME2,
    CONSTRAINT fk_res_table    FOREIGN KEY (table_id)   REFERENCES restaurant_tables(id),
    CONSTRAINT fk_res_creator  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_tables_status ON restaurant_tables(status);
CREATE INDEX idx_res_date      ON reservations(datetime);
CREATE INDEX idx_res_status    ON reservations(status);
CREATE INDEX idx_res_table     ON reservations(table_id);
