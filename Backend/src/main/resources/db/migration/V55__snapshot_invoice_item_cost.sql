-- Preserve the cost basis used by historical financial reports. Existing allocations receive
-- the best available value at migration time; new allocations snapshot cost when invoiced and
-- carry it unchanged through split/merge operations.

ALTER TABLE invoice_item_allocations
    ADD unit_cost_snapshot DECIMAL(12, 0) NULL;

EXEC sys.sp_executesql N'
    UPDATE allocation
    SET unit_cost_snapshot = COALESCE(menu_item.cost_price, 0)
    FROM invoice_item_allocations allocation
    JOIN order_items order_item ON order_item.id = allocation.order_item_id
    JOIN menu_items menu_item ON menu_item.id = order_item.menu_item_id;
';

EXEC sys.sp_executesql N'
    IF EXISTS (
        SELECT 1
        FROM invoice_item_allocations
        WHERE unit_cost_snapshot IS NULL OR unit_cost_snapshot < 0
    )
    BEGIN
        THROW 51010, ''Invoice cost snapshot migration aborted: an allocation has no valid menu cost.'', 1;
    END;
';

EXEC sys.sp_executesql N'
    ALTER TABLE invoice_item_allocations
        ALTER COLUMN unit_cost_snapshot DECIMAL(12, 0) NOT NULL;
';

EXEC sys.sp_executesql N'
    ALTER TABLE invoice_item_allocations
        ADD CONSTRAINT ck_iia_unit_cost_snapshot CHECK (unit_cost_snapshot >= 0);
';
