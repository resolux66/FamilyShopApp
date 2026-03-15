-- FamilyCart Demo Data Seed
-- Run: npx wrangler d1 execute familycart-db --file=./seed-demo.sql --remote
-- Timestamps use unixepoch() so data always appears recent.

-- Clean up any existing demo data
DELETE FROM list_items WHERE list_id IN (SELECT id FROM shopping_lists WHERE family_id = 'demo-family-001');
DELETE FROM shopping_lists WHERE family_id = 'demo-family-001';
DELETE FROM invites WHERE family_id = 'demo-family-001';
DELETE FROM users WHERE family_id = 'demo-family-001';
DELETE FROM families WHERE id = 'demo-family-001';

-- Family
INSERT INTO families (id, name, created_by, created_at)
VALUES ('demo-family-001', 'The Demo Family', 'demo_user_alice', unixepoch() - 2592000);

-- Users
INSERT INTO users (id, family_id, email, display_name, role, joined_at, created_at)
VALUES ('demo_user_alice', 'demo-family-001', 'alice@familycart.demo', 'Alice', 'admin', unixepoch() - 2592000, unixepoch() - 2592000);

INSERT INTO users (id, family_id, email, display_name, role, invited_by, joined_at, created_at)
VALUES ('demo_user_bob', 'demo-family-001', 'bob@familycart.demo', 'Bob', 'member', 'demo_user_alice', unixepoch() - 2592000 + 3600, unixepoch() - 2592000 + 3600);

INSERT INTO users (id, family_id, email, display_name, role, invited_by, joined_at, created_at)
VALUES ('demo_user_carol', 'demo-family-001', 'carol@familycart.demo', 'Carol', 'member', 'demo_user_alice', unixepoch() - 2592000 + 7200, unixepoch() - 2592000 + 7200);

INSERT INTO users (id, family_id, email, display_name, role, invited_by, joined_at, created_at)
VALUES ('demo_user_demo', 'demo-family-001', 'demo@familycart.app', 'Demo User', 'member', 'demo_user_alice', unixepoch() - 3600, unixepoch() - 3600);

-- Shopping lists
INSERT INTO shopping_lists (id, family_id, created_by, name, is_shopping, shopping_started_by, shopping_started_at, created_at, updated_at)
VALUES ('demo_list_groceries', 'demo-family-001', 'demo_user_alice', 'Weekly Groceries', 1, 'demo_user_bob', unixepoch() - 1800, unixepoch() - 259200, unixepoch() - 1800);

INSERT INTO shopping_lists (id, family_id, created_by, name, is_shopping, created_at, updated_at)
VALUES ('demo_list_christmas', 'demo-family-001', 'demo_user_alice', 'Christmas Dinner', 0, unixepoch() - 604800, unixepoch() - 604800);

INSERT INTO shopping_lists (id, family_id, created_by, name, is_shopping, created_at, updated_at)
VALUES ('demo_list_hardware', 'demo-family-001', 'demo_user_bob', 'Bob''s Hardware Run', 0, unixepoch() - 172800, unixepoch() - 172800);

-- Weekly Groceries items (8 items: 3 bought, 5 unbought; shopping mode ON)
INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_g1', 'demo_list_groceries', 'demo_user_alice', 'Whole milk', '2 litres', NULL, 1, 'demo_user_bob', unixepoch() - 1200, 0, unixepoch() - 259200, unixepoch() - 1200);

INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_g2', 'demo_list_groceries', 'demo_user_alice', 'Free-range eggs', '12 pack', NULL, 1, 'demo_user_bob', unixepoch() - 1100, 1, unixepoch() - 259200, unixepoch() - 1100);

INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_g3', 'demo_list_groceries', 'demo_user_carol', 'Sourdough bread', '1 loaf', 'From the bakery section', 1, 'demo_user_bob', unixepoch() - 1000, 2, unixepoch() - 255600, unixepoch() - 1000);

INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_g4', 'demo_list_groceries', 'demo_user_alice', 'Cheddar cheese', '400g block', NULL, 0, NULL, NULL, 3, unixepoch() - 259200, unixepoch() - 259200);

INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_g5', 'demo_list_groceries', 'demo_user_bob', 'Chicken breast', '500g', 'Organic if available', 0, NULL, NULL, 4, unixepoch() - 251200, unixepoch() - 251200);

INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_g6', 'demo_list_groceries', 'demo_user_carol', 'Cherry tomatoes', '250g punnet', NULL, 0, NULL, NULL, 5, unixepoch() - 255600, unixepoch() - 255600);

INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_g7', 'demo_list_groceries', 'demo_user_alice', 'Pasta', '500g', 'Spaghetti or penne', 0, NULL, NULL, 6, unixepoch() - 259200, unixepoch() - 259200);

INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_g8', 'demo_list_groceries', 'demo_user_bob', 'Orange juice', '1 litre', 'No added sugar', 0, NULL, NULL, 7, unixepoch() - 251200, unixepoch() - 251200);

-- Christmas Dinner items (6 items, not in shopping mode)
INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_c1', 'demo_list_christmas', 'demo_user_alice', 'Whole turkey', '5kg', 'Order from butcher by Dec 20', 0, NULL, NULL, 0, unixepoch() - 604800, unixepoch() - 604800);

INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_c2', 'demo_list_christmas', 'demo_user_alice', 'Brussels sprouts', '500g', NULL, 0, NULL, NULL, 1, unixepoch() - 604800, unixepoch() - 604800);

INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_c3', 'demo_list_christmas', 'demo_user_carol', 'Cranberry sauce', '2 jars', NULL, 0, NULL, NULL, 2, unixepoch() - 600000, unixepoch() - 600000);

INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_c4', 'demo_list_christmas', 'demo_user_bob', 'Pigs in blankets', '24 pack', 'From M&S if possible', 0, NULL, NULL, 3, unixepoch() - 597600, unixepoch() - 597600);

INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_c5', 'demo_list_christmas', 'demo_user_alice', 'Red wine', '3 bottles', 'Burgundy or similar', 0, NULL, NULL, 4, unixepoch() - 604800, unixepoch() - 604800);

INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_c6', 'demo_list_christmas', 'demo_user_carol', 'Christmas pudding', '1', 'With brandy butter', 0, NULL, NULL, 5, unixepoch() - 600000, unixepoch() - 600000);

-- Bob's Hardware Run items (3 items, not in shopping mode)
INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_h1', 'demo_list_hardware', 'demo_user_bob', 'Wood screws', '100 pack', 'M4 x 40mm', 0, NULL, NULL, 0, unixepoch() - 172800, unixepoch() - 172800);

INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_h2', 'demo_list_hardware', 'demo_user_alice', 'Sandpaper', 'Assorted pack', '80, 120, and 240 grit', 0, NULL, NULL, 1, unixepoch() - 169200, unixepoch() - 169200);

INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
VALUES ('demo_item_h3', 'demo_list_hardware', 'demo_user_bob', 'Wood glue', '1 bottle', 'Waterproof PVA', 0, NULL, NULL, 2, unixepoch() - 172800, unixepoch() - 172800);
