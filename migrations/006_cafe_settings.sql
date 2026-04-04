CREATE TABLE IF NOT EXISTS cafe_settings (
    id BOOLEAN PRIMARY KEY DEFAULT true,
    name TEXT NOT NULL DEFAULT 'OpenClaw Café',
    image_url TEXT NOT NULL DEFAULT '',
    currency_code TEXT NOT NULL DEFAULT 'USD'
);

INSERT INTO cafe_settings (id, name, image_url, currency_code)
VALUES (true, 'OpenClaw Café', '', 'USD')
ON CONFLICT (id) DO NOTHING;
