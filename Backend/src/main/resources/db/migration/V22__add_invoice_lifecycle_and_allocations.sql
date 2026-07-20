-- Fail before schema changes when existing invoice data cannot be backfilled safely.

IF EXISTS (
    SELECT 1
    FROM invoices
    GROUP BY order_id
    HAVING COUNT_BIG(*) > 1
)
BEGIN
    THROW 51001, 'Invoice allocation migration aborted: multiple invoices reference the same order.', 1;
END;

IF EXISTS (
    SELECT 1
    FROM invoices i
    LEFT JOIN orders o ON o.id = i.order_id
    WHERE o.id IS NULL
)
BEGIN
    THROW 51002, 'Invoice allocation migration aborted: an invoice references a missing order.', 1;
END;

IF EXISTS (
    SELECT 1
    FROM order_items oi
    LEFT JOIN orders o ON o.id = oi.order_id
    WHERE oi.cooking_status IN ('READY', 'SERVED')
      AND o.id IS NULL
)
BEGIN
    THROW 51003, 'Invoice allocation migration aborted: a payable order item references a missing order.', 1;
END;

IF EXISTS (
    SELECT 1
    FROM invoices i
    WHERE NOT EXISTS (
        SELECT 1
        FROM order_items oi
        WHERE oi.order_id = i.order_id
          AND oi.cooking_status IN ('READY', 'SERVED')
    )
)
BEGIN
    THROW 51004, 'Invoice allocation migration aborted: an invoice has no payable order items.', 1;
END;

IF EXISTS (
    SELECT 1
    FROM invoices i
    JOIN order_items oi ON oi.order_id = i.order_id
    WHERE oi.cooking_status IN ('READY', 'SERVED')
      AND (oi.quantity <= 0 OR oi.unit_price <= 0)
)
BEGIN
    THROW 51005, 'Invoice allocation migration aborted: a payable order item has a non-positive quantity or unit price.', 1;
END;

IF EXISTS (
    SELECT 1
    FROM invoices i
    CROSS APPLY (
        SELECT SUM(CONVERT(DECIMAL(38, 0), oi.unit_price) * oi.quantity) AS expected_subtotal
        FROM order_items oi
        WHERE oi.order_id = i.order_id
          AND oi.cooking_status IN ('READY', 'SERVED')
    ) totals
    WHERE totals.expected_subtotal <> CONVERT(DECIMAL(38, 0), i.subtotal)
)
BEGIN
    THROW 51006, 'Invoice allocation migration aborted: payable order items do not reconcile with invoice subtotal.', 1;
END;

IF EXISTS (
    SELECT 1
    FROM payments p
    LEFT JOIN invoices i ON i.id = p.invoice_id
    WHERE i.id IS NULL
)
BEGIN
    THROW 51007, 'Invoice allocation migration aborted: a payment references a missing invoice.', 1;
END;

IF EXISTS (
    SELECT 1
    FROM invoices i
    WHERE i.is_paid = 1
      AND NOT EXISTS (
          SELECT 1
          FROM payments p
          WHERE p.invoice_id = i.id
            AND p.status = 'PAID'
      )
)
BEGIN
    THROW 51008, 'Invoice allocation migration aborted: a paid invoice has no PAID payment record.', 1;
END;

IF EXISTS (
    SELECT 1
    FROM payments p
    JOIN invoices i ON i.id = p.invoice_id
    WHERE p.status = 'PAID'
      AND p.amount <> i.total_amount
)
BEGIN
    THROW 51009, 'Invoice allocation migration aborted: a PAID payment amount differs from its invoice total.', 1;
END;

ALTER TABLE invoices ADD
    status NVARCHAR(20) NULL,
    merged_into_invoice_id NVARCHAR(36) NULL;

EXEC sys.sp_executesql N'
    UPDATE invoices
    SET status = N''ACTIVE'';
';

EXEC sys.sp_executesql N'
    ALTER TABLE invoices
    ALTER COLUMN status NVARCHAR(20) NOT NULL;
';

EXEC sys.sp_executesql N'
    ALTER TABLE invoices ADD
        CONSTRAINT ck_invoices_status
            CHECK (status IN (N''ACTIVE'', N''MERGED'')),
        CONSTRAINT ck_invoices_merge_lineage
            CHECK (
                (status = N''ACTIVE'' AND merged_into_invoice_id IS NULL)
                OR (status = N''MERGED'' AND merged_into_invoice_id IS NOT NULL)
            ),
        CONSTRAINT ck_invoices_no_self_merge
            CHECK (
                merged_into_invoice_id IS NULL
                OR merged_into_invoice_id <> id
            ),
        CONSTRAINT fk_invoices_merged_into
            FOREIGN KEY (merged_into_invoice_id)
            REFERENCES invoices(id)
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
';

CREATE TABLE invoice_item_allocations (
    id                  NVARCHAR(36)   NOT NULL PRIMARY KEY,
    invoice_id          NVARCHAR(36)   NOT NULL,
    order_item_id       NVARCHAR(36)   NOT NULL,
    allocated_quantity  INT            NOT NULL,
    unit_price_snapshot DECIMAL(12, 0) NOT NULL,
    active              BIT            NOT NULL CONSTRAINT df_iia_active DEFAULT 1,
    created_at          DATETIME2      NOT NULL,
    CONSTRAINT fk_iia_invoice
        FOREIGN KEY (invoice_id) REFERENCES invoices(id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_iia_order_item
        FOREIGN KEY (order_item_id) REFERENCES order_items(id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT ck_iia_allocated_quantity CHECK (allocated_quantity > 0),
    CONSTRAINT ck_iia_unit_price_snapshot CHECK (unit_price_snapshot > 0)
);

DECLARE @migration_time DATETIME2 = SYSDATETIME();

INSERT INTO invoice_item_allocations (
    id,
    invoice_id,
    order_item_id,
    allocated_quantity,
    unit_price_snapshot,
    active,
    created_at
)
SELECT
    CONVERT(NVARCHAR(36), NEWID()),
    i.id,
    oi.id,
    oi.quantity,
    oi.unit_price,
    1,
    COALESCE(i.created_at, @migration_time)
FROM invoices i
JOIN order_items oi ON oi.order_id = i.order_id
WHERE oi.cooking_status IN ('READY', 'SERVED');

CREATE INDEX idx_iia_invoice_active
    ON invoice_item_allocations(invoice_id, active);

CREATE INDEX idx_iia_order_item
    ON invoice_item_allocations(order_item_id);

CREATE UNIQUE INDEX uq_iia_active_order_item
    ON invoice_item_allocations(order_item_id)
    WHERE active = 1;
