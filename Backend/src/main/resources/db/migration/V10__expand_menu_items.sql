-- V10: Expand menu_items with management metadata
-- (item code, cost price, menu/item type, tag, stock-tracking flag)

ALTER TABLE menu_items ADD
    code        NVARCHAR(50),
    cost_price  DECIMAL(12, 0),
    menu_type   NVARCHAR(50),
    item_type   NVARCHAR(50),
    tag         NVARCHAR(50),
    track_stock BIT NOT NULL DEFAULT 0;
