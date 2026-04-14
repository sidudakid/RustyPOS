ALTER TABLE cafe_settings
    ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'disabled',
    ADD COLUMN IF NOT EXISTS payment_display_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS payment_payee_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS payment_vpa TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS payment_phone_number TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS payment_reference_prefix TEXT NOT NULL DEFAULT 'OPENCLAW',
    ADD COLUMN IF NOT EXISTS payment_qr_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS payment_instructions TEXT NOT NULL DEFAULT '';

UPDATE cafe_settings
SET payment_display_name = CASE
        WHEN payment_display_name = '' THEN name
        ELSE payment_display_name
    END,
    payment_payee_name = CASE
        WHEN payment_payee_name = '' THEN COALESCE(NULLIF(legal_name, ''), name)
        ELSE payment_payee_name
    END,
    payment_reference_prefix = CASE
        WHEN payment_reference_prefix = '' THEN 'OPENCLAW'
        ELSE payment_reference_prefix
    END;