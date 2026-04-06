CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    hot_pick BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO menu_categories (id, name, hot_pick)
VALUES
    ('55555555-5555-5555-5555-555555555551', 'coffee', true),
    ('55555555-5555-5555-5555-555555555552', 'pastry', true),
    ('55555555-5555-5555-5555-555555555553', 'drinks', false)
ON CONFLICT (name) DO NOTHING;
