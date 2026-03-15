import type { Env } from './types';

function now(): number {
  return Math.floor(Date.now() / 1000);
}

export async function handleCron(
  _event: ScheduledEvent,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  const ts = now();
  const fid = env.DEMO_FAMILY_ID;

  console.log(`Demo data reset at ${new Date().toISOString()}`);

  // Delete all demo data in dependency order
  await env.DB.batch([
    env.DB.prepare(
      'DELETE FROM list_items WHERE list_id IN (SELECT id FROM shopping_lists WHERE family_id = ?)'
    ).bind(fid),
    env.DB.prepare('DELETE FROM shopping_lists WHERE family_id = ?').bind(fid),
    env.DB.prepare('DELETE FROM invites WHERE family_id = ?').bind(fid),
    env.DB.prepare('DELETE FROM users WHERE family_id = ?').bind(fid),
    env.DB.prepare('DELETE FROM families WHERE id = ?').bind(fid),
  ]);

  // Timestamps relative to reset time
  const createdAt = ts - 30 * 24 * 3600; // family created 30 days ago
  const list1At = ts - 3 * 24 * 3600;    // groceries list created 3 days ago
  const list2At = ts - 7 * 24 * 3600;    // christmas list created 7 days ago
  const list3At = ts - 2 * 24 * 3600;    // hardware list created 2 days ago

  // Re-insert family
  await env.DB.prepare(
    'INSERT INTO families (id, name, created_by, created_at) VALUES (?, ?, ?, ?)'
  ).bind(fid, 'The Demo Family', 'demo_user_alice', createdAt).run();

  // Re-insert users
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO users (id, family_id, email, display_name, role, joined_at, created_at)
       VALUES (?, ?, ?, ?, 'admin', ?, ?)`
    ).bind('demo_user_alice', fid, 'alice@familycart.demo', 'Alice', createdAt, createdAt),

    env.DB.prepare(
      `INSERT INTO users (id, family_id, email, display_name, role, invited_by, joined_at, created_at)
       VALUES (?, ?, ?, ?, 'member', ?, ?, ?)`
    ).bind('demo_user_bob', fid, 'bob@familycart.demo', 'Bob', 'demo_user_alice', createdAt + 3600, createdAt + 3600),

    env.DB.prepare(
      `INSERT INTO users (id, family_id, email, display_name, role, invited_by, joined_at, created_at)
       VALUES (?, ?, ?, ?, 'member', ?, ?, ?)`
    ).bind('demo_user_carol', fid, 'carol@familycart.demo', 'Carol', 'demo_user_alice', createdAt + 7200, createdAt + 7200),

    env.DB.prepare(
      `INSERT INTO users (id, family_id, email, display_name, role, invited_by, joined_at, created_at)
       VALUES (?, ?, ?, ?, 'member', ?, ?, ?)`
    ).bind('demo_user_demo', fid, 'demo@familycart.app', 'Demo User', 'demo_user_alice', ts - 3600, ts - 3600),
  ]);

  // Re-insert shopping lists
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO shopping_lists (id, family_id, created_by, name, is_shopping, shopping_started_by, shopping_started_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`
    ).bind('demo_list_groceries', fid, 'demo_user_alice', 'Weekly Groceries', 'demo_user_bob', ts - 1800, list1At, ts - 1800),

    env.DB.prepare(
      `INSERT INTO shopping_lists (id, family_id, created_by, name, is_shopping, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`
    ).bind('demo_list_christmas', fid, 'demo_user_alice', 'Christmas Dinner', list2At, list2At),

    env.DB.prepare(
      `INSERT INTO shopping_lists (id, family_id, created_by, name, is_shopping, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`
    ).bind('demo_list_hardware', fid, 'demo_user_bob', "Bob's Hardware Run", list3At, list3At),
  ]);

  // Weekly Groceries items (8 items: 3 bought, 5 unbought)
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_g1', 'demo_list_groceries', 'demo_user_alice', 'Whole milk', '2 litres', null, 1, 'demo_user_bob', ts - 1200, 0, list1At, ts - 1200),

    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_g2', 'demo_list_groceries', 'demo_user_alice', 'Free-range eggs', '12 pack', null, 1, 'demo_user_bob', ts - 1100, 1, list1At, ts - 1100),

    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_g3', 'demo_list_groceries', 'demo_user_carol', 'Sourdough bread', '1 loaf', 'From the bakery section', 1, 'demo_user_bob', ts - 1000, 2, list1At + 3600, ts - 1000),

    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_g4', 'demo_list_groceries', 'demo_user_alice', 'Cheddar cheese', '400g block', null, 0, null, null, 3, list1At, list1At),

    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_g5', 'demo_list_groceries', 'demo_user_bob', 'Chicken breast', '500g', 'Organic if available', 0, null, null, 4, list1At + 7200, list1At + 7200),

    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_g6', 'demo_list_groceries', 'demo_user_carol', 'Cherry tomatoes', '250g punnet', null, 0, null, null, 5, list1At + 3600, list1At + 3600),

    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_g7', 'demo_list_groceries', 'demo_user_alice', 'Pasta', '500g', 'Spaghetti or penne', 0, null, null, 6, list1At, list1At),

    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_g8', 'demo_list_groceries', 'demo_user_bob', 'Orange juice', '1 litre', 'No added sugar', 0, null, null, 7, list1At + 7200, list1At + 7200),
  ]);

  // Christmas Dinner items (6 items)
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_c1', 'demo_list_christmas', 'demo_user_alice', 'Whole turkey', '5kg', 'Order from butcher by Dec 20', 0, null, null, 0, list2At, list2At),

    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_c2', 'demo_list_christmas', 'demo_user_alice', 'Brussels sprouts', '500g', null, 0, null, null, 1, list2At, list2At),

    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_c3', 'demo_list_christmas', 'demo_user_carol', 'Cranberry sauce', '2 jars', null, 0, null, null, 2, list2At + 3600, list2At + 3600),

    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_c4', 'demo_list_christmas', 'demo_user_bob', 'Pigs in blankets', '24 pack', 'From M&S if possible', 0, null, null, 3, list2At + 7200, list2At + 7200),

    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_c5', 'demo_list_christmas', 'demo_user_alice', 'Red wine', '3 bottles', 'Burgundy or similar', 0, null, null, 4, list2At, list2At),

    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_c6', 'demo_list_christmas', 'demo_user_carol', 'Christmas pudding', '1', 'With brandy butter', 0, null, null, 5, list2At + 3600, list2At + 3600),
  ]);

  // Bob's Hardware Run items (3 items)
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_h1', 'demo_list_hardware', 'demo_user_bob', 'Wood screws', '100 pack', 'M4 x 40mm', 0, null, null, 0, list3At, list3At),

    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_h2', 'demo_list_hardware', 'demo_user_alice', 'Sandpaper', 'Assorted pack', '80, 120, and 240 grit', 0, null, null, 1, list3At + 1800, list3At + 1800),

    env.DB.prepare(
      `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, bought_by, bought_at, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('demo_item_h3', 'demo_list_hardware', 'demo_user_bob', 'Wood glue', '1 bottle', 'Waterproof PVA', 0, null, null, 2, list3At, list3At),
  ]);

  console.log(`Demo data reset complete at ${new Date().toISOString()}`);
}
