ALTER TABLE tables
    ADD COLUMN IF NOT EXISTS table_number INTEGER,
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY name, id) AS seq
    FROM tables
    WHERE table_number IS NULL
)
UPDATE tables t
SET table_number = numbered.seq
FROM numbered
WHERE t.id = numbered.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tables_table_number ON tables (table_number);
CREATE INDEX IF NOT EXISTS idx_tables_active ON tables (active);
