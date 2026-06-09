-- V4: Orders, Order Items, Assistance Requests

CREATE TABLE orders (
    id         NVARCHAR(36) NOT NULL PRIMARY KEY,
    table_id   NVARCHAR(36) NOT NULL,
    cashier_id NVARCHAR(36),
    status     NVARCHAR(20) NOT NULL DEFAULT 'pending',
    note       NVARCHAR(500),
    created_at DATETIME2,
    updated_at DATETIME2,
    CONSTRAINT fk_order_table   FOREIGN KEY (table_id)   REFERENCES restaurant_tables(id),
    CONSTRAINT fk_order_cashier FOREIGN KEY (cashier_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    id             NVARCHAR(36)   NOT NULL PRIMARY KEY,
    order_id       NVARCHAR(36)   NOT NULL,
    menu_item_id   NVARCHAR(36)   NOT NULL,
    menu_item_name NVARCHAR(200)  NOT NULL,
    quantity       INT            NOT NULL,
    unit_price     DECIMAL(12, 0) NOT NULL,
    note           NVARCHAR(300),
    cooking_status NVARCHAR(20),
    CONSTRAINT fk_oi_order     FOREIGN KEY (order_id)     REFERENCES orders(id),
    CONSTRAINT fk_oi_menu_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

CREATE TABLE assistance_requests (
    id          NVARCHAR(36) NOT NULL PRIMARY KEY,
    table_id    NVARCHAR(36) NOT NULL,
    message     NVARCHAR(300),
    resolved    BIT          NOT NULL DEFAULT 0,
    resolved_by NVARCHAR(36),
    resolved_at DATETIME2,
    created_at  DATETIME2,
    CONSTRAINT fk_ar_table FOREIGN KEY (table_id) REFERENCES restaurant_tables(id)
);

CREATE INDEX idx_orders_table   ON orders(table_id);
CREATE INDEX idx_orders_status  ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_oi_order       ON order_items(order_id);
CREATE INDEX idx_ar_table       ON assistance_requests(table_id);
CREATE INDEX idx_ar_resolved    ON assistance_requests(resolved);
