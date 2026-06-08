-- V3: Menu Categories and Items

CREATE TABLE menu_categories (
    id            NVARCHAR(36)  NOT NULL PRIMARY KEY,
    name          NVARCHAR(100) NOT NULL UNIQUE,
    display_order INT           NOT NULL DEFAULT 0,
    icon          NVARCHAR(100)
);

CREATE TABLE menu_items (
    id           NVARCHAR(36)   NOT NULL PRIMARY KEY,
    category_id  NVARCHAR(36)   NOT NULL,
    name         NVARCHAR(200)  NOT NULL,
    price        DECIMAL(12, 0) NOT NULL,
    description  NVARCHAR(MAX),
    image_url    NVARCHAR(500),
    available    BIT            NOT NULL DEFAULT 1,
    updated_at   DATETIME2,
    CONSTRAINT fk_item_category FOREIGN KEY (category_id) REFERENCES menu_categories(id)
);

CREATE INDEX idx_menu_items_category  ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(available);
