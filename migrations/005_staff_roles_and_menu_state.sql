DO $$ BEGIN
    CREATE TYPE staff_role AS ENUM ('owner', 'staff', 'kitchen');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS staff_users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    role staff_role NOT NULL,
    auth_token TEXT NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE menu_categories
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE menu_items
    ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS available BOOLEAN NOT NULL DEFAULT true;

UPDATE menu_categories
SET sort_order = CASE name
    WHEN 'coffee' THEN 10
    WHEN 'pastry' THEN 20
    WHEN 'drinks' THEN 30
    ELSE sort_order
END;

INSERT INTO staff_users (id, name, role, auth_token, active)
VALUES
    ('99999999-9999-9999-9999-999999999991', 'Cafe Owner', 'owner', 'owner-demo-token', true),
    ('99999999-9999-9999-9999-999999999992', 'Floor Staff', 'staff', 'staff-demo-token', true),
    ('99999999-9999-9999-9999-999999999993', 'Kitchen Screen', 'kitchen', 'kitchen-demo-token', true)
ON CONFLICT (auth_token) DO NOTHING;
