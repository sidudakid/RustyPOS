ALTER TABLE menu_items
    ADD COLUMN IF NOT EXISTS estimated_cost BIGINT NOT NULL DEFAULT 0;

UPDATE menu_items
SET estimated_cost = CASE name
    WHEN 'Espresso' THEN 110
    WHEN 'Flat White' THEN 180
    WHEN 'Cold Brew' THEN 190
    WHEN 'Croissant' THEN 160
    WHEN 'Banana Bread' THEN 175
    WHEN 'Sparkling Water' THEN 90
    ELSE estimated_cost
END
WHERE estimated_cost = 0;

CREATE TABLE IF NOT EXISTS monthly_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_start DATE NOT NULL UNIQUE,
    rent BIGINT NOT NULL DEFAULT 0,
    payroll BIGINT NOT NULL DEFAULT 0,
    utilities BIGINT NOT NULL DEFAULT 0,
    marketing BIGINT NOT NULL DEFAULT 0,
    misc BIGINT NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO monthly_expenses (month_start, rent, payroll, utilities, marketing, misc, notes)
VALUES
    (DATE_TRUNC('month', CURRENT_DATE)::DATE, 0, 0, 0, 0, 0, 'Seeded default month for stakeholder reporting')
ON CONFLICT (month_start) DO NOTHING;
