ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS follow_up_additions_count INTEGER NOT NULL DEFAULT 0;

UPDATE orders
SET updated_at = COALESCE(paid_at, created_at, NOW())
WHERE updated_at IS NULL OR updated_at < created_at;
