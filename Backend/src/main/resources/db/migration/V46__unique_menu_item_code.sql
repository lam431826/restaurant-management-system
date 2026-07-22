-- V46: enforce uniqueness on menu_items.code. It was added by V10 with no UNIQUE constraint at
-- all, which let two items silently share the same code — the create-item UI computed its
-- "next auto code" suggestion from only the currently loaded page of items, so it regularly
-- collided with a code that existed elsewhere in the dataset. A filtered index (not a plain
-- UNIQUE constraint) is used because code is nullable and SQL Server's plain UNIQUE only
-- tolerates a single NULL row — same fix pattern as V39 for users.email.

CREATE UNIQUE NONCLUSTERED INDEX UQ_menu_items_code ON menu_items(code) WHERE code IS NOT NULL;
