import { Hono } from 'hono';
import type { Env, Variables } from '../types';

const users = new Hono<{ Bindings: Env; Variables: Variables }>();

// Require authenticated user
users.use('*', async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }
  await next();
});

// PATCH /api/v1/users/me
users.patch('/users/me', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{ display_name?: string }>();

  const displayName = body.display_name?.trim();
  if (!displayName) {
    return c.json({ error: 'display_name cannot be empty', code: 'INVALID_INPUT' }, 400);
  }

  await c.env.DB.prepare(
    'UPDATE users SET display_name = ? WHERE id = ? AND family_id = ?'
  )
    .bind(displayName, user.id, user.family_id)
    .run();

  const updated = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(user.id)
    .first();

  return c.json(updated);
});

// GET /api/v1/users/me/stats — activity summary
users.get('/users/me/stats', async (c) => {
  const user = c.get('user')!;

  const listsCreated = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM shopping_lists WHERE created_by = ? AND family_id = ?'
  )
    .bind(user.id, user.family_id)
    .first<{ count: number }>();

  const itemsAdded = await c.env.DB.prepare(
    `SELECT COUNT(*) as count
     FROM list_items li
     JOIN shopping_lists sl ON sl.id = li.list_id
     WHERE li.added_by = ? AND sl.family_id = ?`
  )
    .bind(user.id, user.family_id)
    .first<{ count: number }>();

  const itemsBought = await c.env.DB.prepare(
    `SELECT COUNT(*) as count
     FROM list_items li
     JOIN shopping_lists sl ON sl.id = li.list_id
     WHERE li.bought_by = ? AND sl.family_id = ?`
  )
    .bind(user.id, user.family_id)
    .first<{ count: number }>();

  return c.json({
    lists_created: listsCreated?.count ?? 0,
    items_added: itemsAdded?.count ?? 0,
    items_bought: itemsBought?.count ?? 0,
  });
});

export default users;
