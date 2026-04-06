ALTER TABLE menu_items
    ADD COLUMN IF NOT EXISTS stock_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS restock_needed BOOLEAN NOT NULL DEFAULT false;

UPDATE menu_items
SET stock_count = CASE name
    WHEN 'Espresso' THEN 40
    WHEN 'Flat White' THEN 25
    WHEN 'Cold Brew' THEN 18
    WHEN 'Croissant' THEN 14
    WHEN 'Banana Bread' THEN 10
    WHEN 'Sparkling Water' THEN 30
    ELSE stock_count
END,
low_stock_threshold = CASE category
    WHEN 'coffee' THEN 8
    WHEN 'pastry' THEN 4
    WHEN 'drinks' THEN 6
    ELSE low_stock_threshold
END,
restock_needed = CASE
    WHEN stock_count <= low_stock_threshold THEN true
    ELSE restock_needed
END;
