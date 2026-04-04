INSERT INTO tables (id, name)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Table 1'),
    ('22222222-2222-2222-2222-222222222222', 'Table 2'),
    ('33333333-3333-3333-3333-333333333333', 'Window Bar')
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (id, name, price, category)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Espresso', 300, 'coffee'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Flat White', 450, 'coffee'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Cold Brew', 500, 'coffee'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Croissant', 425, 'pastry'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'Banana Bread', 475, 'pastry'),
    ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'Sparkling Water', 250, 'drinks')
ON CONFLICT (id) DO NOTHING;
