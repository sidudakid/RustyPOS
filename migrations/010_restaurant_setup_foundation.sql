ALTER TABLE cafe_settings
    ADD COLUMN IF NOT EXISTS legal_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS slug TEXT NOT NULL DEFAULT 'openclaw-cafe',
    ADD COLUMN IF NOT EXISTS tagline TEXT NOT NULL DEFAULT 'Fast café ordering for customers, kitchen, and staff.',
    ADD COLUMN IF NOT EXISTS primary_color TEXT NOT NULL DEFAULT '#2563EB',
    ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#F59E0B',
    ADD COLUMN IF NOT EXISTS support_email TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS support_phone TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS address_line_1 TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS address_line_2 TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS state_region TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS postal_code TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'US',
    ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York',
    ADD COLUMN IF NOT EXISTS service_mode TEXT NOT NULL DEFAULT 'table_service',
    ADD COLUMN IF NOT EXISTS table_count INTEGER NOT NULL DEFAULT 12,
    ADD COLUMN IF NOT EXISTS table_prefix TEXT NOT NULL DEFAULT 'Table',
    ADD COLUMN IF NOT EXISTS table_name_style TEXT NOT NULL DEFAULT 'numeric';

UPDATE cafe_settings
SET slug = CASE
        WHEN slug = '' THEN regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')
        ELSE slug
    END,
    legal_name = CASE
        WHEN legal_name = '' THEN name
        ELSE legal_name
    END,
    table_count = CASE
        WHEN table_count < 1 THEN 12
        ELSE table_count
    END,
    table_prefix = CASE
        WHEN table_prefix = '' THEN 'Table'
        ELSE table_prefix
    END;
