-- V41: allow partial-quantity invoice split.
--
-- V22 created uq_iia_active_order_item, a filtered unique index on
-- invoice_item_allocations(order_item_id) WHERE active = 1. That enforced "at most one
-- ACTIVE allocation per order item in the whole database", which is what made split a
-- whole-allocation-only operation: an item could never be actively billed on two
-- invoices at once.
--
-- Partial-quantity split needs exactly that: after splitting 1 of 3 units, the source
-- invoice keeps an ACTIVE allocation of 2 and the child invoice holds an ACTIVE
-- allocation of 1 — both for the same order item.
--
-- The replacement index keeps the protection that still matters (an order item may not
-- appear twice as an ACTIVE allocation *within the same invoice*, so a single invoice can
-- never double-bill a line) while permitting the source/child pair across invoices.
--
-- The removed global guarantee is replaced in application code by a quantity-aware check
-- performed under the existing pessimistic locks:
--     SUM(active allocated_quantity) per order_item <= order_items.quantity
-- See InvoiceAllocationQuantityGuard.
--
-- Index changes only. No business data is read or modified.

IF EXISTS (SELECT 1 FROM sys.indexes
           WHERE name = 'uq_iia_active_order_item'
             AND object_id = OBJECT_ID('invoice_item_allocations'))
    DROP INDEX uq_iia_active_order_item ON invoice_item_allocations;

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'uq_iia_active_invoice_order_item'
                 AND object_id = OBJECT_ID('invoice_item_allocations'))
    CREATE UNIQUE INDEX uq_iia_active_invoice_order_item
        ON invoice_item_allocations(invoice_id, order_item_id)
        WHERE active = 1;
