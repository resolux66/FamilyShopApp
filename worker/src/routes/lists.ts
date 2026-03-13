import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { generateUUID, now, notifyDO } from '../utils';

const lists = new Hono<{ Bindings: Env; Variables: Variables }>();

// Require authenticated user
lists.use('*', async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }
  await next();
});

// GET /api/v1/lists
lists.get('/lists', async (c) => {
  const user = c.get('user')!;

  const result = await c.env.DB.prepare(
    `SELECT
       sl.*,
       u.display_name as creator_name,
       us.display_name as starter_name,
       COUNT(li.id) as item_count
     FROM shopping_lists sl
     LEFT JOIN users u ON u.id = sl.created_by
     LEFT JOIN users us ON us.id = sl.shopping_started_by
     LEFT JOIN list_items li ON li.list_id = sl.id
     WHERE sl.family_id = ?
     GROUP BY sl.id
     ORDER BY sl.updated_at DESC`
  )
    .bind(user.family_id)
    .all();

  return c.json(result.results);
});

// POST /api/v1/lists
lists.post('/lists', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{ name?: string }>();

  if (!body.name?.trim()) {
    return c.json({ error: 'name is required', code: 'MISSING_FIELDS' }, 400);
  }

  const ts = now();
  const listId = generateUUID();

  await c.env.DB.prepare(
    `INSERT INTO shopping_lists (id, family_id, created_by, name, is_shopping, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`
  )
    .bind(listId, user.family_id, user.id, body.name.trim(), ts, ts)
    .run();

  const list = await c.env.DB.prepare(
    `SELECT sl.*, u.display_name as creator_name
     FROM shopping_lists sl
     LEFT JOIN users u ON u.id = sl.created_by
     WHERE sl.id = ?`
  )
    .bind(listId)
    .first();

  return c.json(list, 201);
});

// GET /api/v1/lists/:id
lists.get('/lists/:id', async (c) => {
  const user = c.get('user')!;
  const listId = c.req.param('id');

  const list = await c.env.DB.prepare(
    `SELECT
       sl.*,
       u.display_name as creator_name,
       us.display_name as starter_name
     FROM shopping_lists sl
     LEFT JOIN users u ON u.id = sl.created_by
     LEFT JOIN users us ON us.id = sl.shopping_started_by
     WHERE sl.id = ? AND sl.family_id = ?`
  )
    .bind(listId, user.family_id)
    .first();

  if (!list) {
    return c.json({ error: 'List not found', code: 'NOT_FOUND' }, 404);
  }

  const items = await c.env.DB.prepare(
    `SELECT
       li.*,
       u.display_name as adder_name,
       ub.display_name as buyer_name
     FROM list_items li
     LEFT JOIN users u ON u.id = li.added_by
     LEFT JOIN users ub ON ub.id = li.bought_by
     WHERE li.list_id = ?
     ORDER BY li.position ASC, li.created_at ASC`
  )
    .bind(listId)
    .all();

  return c.json({ list, items: items.results });
});

// PATCH /api/v1/lists/:id
lists.patch('/lists/:id', async (c) => {
  const user = c.get('user')!;
  const listId = c.req.param('id');

  const list = await c.env.DB.prepare(
    'SELECT * FROM shopping_lists WHERE id = ? AND family_id = ?'
  )
    .bind(listId, user.family_id)
    .first<{
      id: string;
      family_id: string;
      created_by: string;
      name: string;
      is_shopping: number;
    }>();

  if (!list) {
    return c.json({ error: 'List not found', code: 'NOT_FOUND' }, 404);
  }

  const body = await c.req.json<{
    name?: string;
    is_shopping?: boolean;
    removeBought?: boolean;
  }>();

  const ts = now();
  const updates: string[] = ['updated_at = ?'];
  const bindings: unknown[] = [ts];

  // Name change: only creator or admin
  if (body.name !== undefined) {
    if (list.created_by !== user.id && user.role !== 'admin') {
      return c.json({ error: 'Permission denied', code: 'FORBIDDEN' }, 403);
    }
    updates.push('name = ?');
    bindings.push(body.name.trim());
  }

  // Shopping mode toggle: any member
  if (body.is_shopping !== undefined) {
    updates.push('is_shopping = ?');
    bindings.push(body.is_shopping ? 1 : 0);

    if (body.is_shopping) {
      updates.push('shopping_started_by = ?', 'shopping_started_at = ?');
      bindings.push(user.id, ts);
    } else {
      updates.push('shopping_started_by = NULL', 'shopping_started_at = NULL');
      // Remove bought items if requested
      if (body.removeBought) {
        await c.env.DB.prepare(
          'DELETE FROM list_items WHERE list_id = ? AND is_bought = 1'
        )
          .bind(listId)
          .run();
      }
    }
  }

  bindings.push(listId, user.family_id);

  await c.env.DB.prepare(
    `UPDATE shopping_lists SET ${updates.join(', ')} WHERE id = ? AND family_id = ?`
  )
    .bind(...bindings)
    .run();

  const updated = await c.env.DB.prepare(
    `SELECT sl.*, u.display_name as creator_name, us.display_name as starter_name
     FROM shopping_lists sl
     LEFT JOIN users u ON u.id = sl.created_by
     LEFT JOIN users us ON us.id = sl.shopping_started_by
     WHERE sl.id = ?`
  )
    .bind(listId)
    .first();

  await notifyDO(c.env.LIST_DO, listId, { type: 'list_updated', payload: updated });

  return c.json(updated);
});

// DELETE /api/v1/lists/:id
lists.delete('/lists/:id', async (c) => {
  const user = c.get('user')!;
  const listId = c.req.param('id');

  const list = await c.env.DB.prepare(
    'SELECT * FROM shopping_lists WHERE id = ? AND family_id = ?'
  )
    .bind(listId, user.family_id)
    .first<{ id: string; created_by: string }>();

  if (!list) {
    return c.json({ error: 'List not found', code: 'NOT_FOUND' }, 404);
  }

  if (list.created_by !== user.id && user.role !== 'admin') {
    return c.json({ error: 'Permission denied', code: 'FORBIDDEN' }, 403);
  }

  await c.env.DB.prepare('DELETE FROM shopping_lists WHERE id = ? AND family_id = ?')
    .bind(listId, user.family_id)
    .run();

  return new Response(null, { status: 204 });
});

// POST /api/v1/lists/:id/items
lists.post('/lists/:id/items', async (c) => {
  const user = c.get('user')!;
  const listId = c.req.param('id');

  // Verify list belongs to family
  const list = await c.env.DB.prepare(
    'SELECT id FROM shopping_lists WHERE id = ? AND family_id = ?'
  )
    .bind(listId, user.family_id)
    .first();

  if (!list) {
    return c.json({ error: 'List not found', code: 'NOT_FOUND' }, 404);
  }

  const body = await c.req.json<{ name?: string; quantity?: string; note?: string }>();
  if (!body.name?.trim()) {
    return c.json({ error: 'name is required', code: 'MISSING_FIELDS' }, 400);
  }

  const ts = now();
  const itemId = generateUUID();

  // Get max position
  const maxPos = await c.env.DB.prepare(
    'SELECT COALESCE(MAX(position), -1) as max_pos FROM list_items WHERE list_id = ?'
  )
    .bind(listId)
    .first<{ max_pos: number }>();

  const position = (maxPos?.max_pos ?? -1) + 1;

  await c.env.DB.prepare(
    `INSERT INTO list_items (id, list_id, added_by, name, quantity, note, is_bought, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
  )
    .bind(
      itemId,
      listId,
      user.id,
      body.name.trim(),
      body.quantity?.trim() || null,
      body.note?.trim() || null,
      position,
      ts,
      ts
    )
    .run();

  // Update list updated_at
  await c.env.DB.prepare(
    'UPDATE shopping_lists SET updated_at = ? WHERE id = ?'
  )
    .bind(ts, listId)
    .run();

  const item = await c.env.DB.prepare(
    `SELECT li.*, u.display_name as adder_name
     FROM list_items li
     LEFT JOIN users u ON u.id = li.added_by
     WHERE li.id = ?`
  )
    .bind(itemId)
    .first();

  await notifyDO(c.env.LIST_DO, listId, { type: 'item_added', payload: item });

  return c.json(item, 201);
});

// PATCH /api/v1/lists/:id/items/:itemId
lists.patch('/lists/:id/items/:itemId', async (c) => {
  const user = c.get('user')!;
  const listId = c.req.param('id');
  const itemId = c.req.param('itemId');

  // Verify item belongs to a list in user's family
  const item = await c.env.DB.prepare(
    `SELECT li.*
     FROM list_items li
     JOIN shopping_lists sl ON sl.id = li.list_id
     WHERE li.id = ? AND li.list_id = ? AND sl.family_id = ?`
  )
    .bind(itemId, listId, user.family_id)
    .first<{
      id: string;
      list_id: string;
      added_by: string;
      name: string;
      quantity: string | null;
      note: string | null;
      is_bought: number;
      bought_by: string | null;
      bought_at: number | null;
      position: number;
    }>();

  if (!item) {
    return c.json({ error: 'Item not found', code: 'NOT_FOUND' }, 404);
  }

  const body = await c.req.json<{
    name?: string;
    quantity?: string;
    note?: string;
    is_bought?: boolean;
    position?: number;
  }>();

  const ts = now();
  const updates: string[] = ['updated_at = ?'];
  const bindings: unknown[] = [ts];

  // Name/quantity/note: only adder or admin
  if (body.name !== undefined || body.quantity !== undefined || body.note !== undefined) {
    if (item.added_by !== user.id && user.role !== 'admin') {
      return c.json({ error: 'Permission denied', code: 'FORBIDDEN' }, 403);
    }
    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return c.json({ error: 'name cannot be empty', code: 'INVALID_INPUT' }, 400);
      }
      updates.push('name = ?');
      bindings.push(body.name.trim());
    }
    if (body.quantity !== undefined) {
      updates.push('quantity = ?');
      bindings.push(body.quantity?.trim() || null);
    }
    if (body.note !== undefined) {
      updates.push('note = ?');
      bindings.push(body.note?.trim() || null);
    }
  }

  // is_bought: any member
  if (body.is_bought !== undefined) {
    updates.push('is_bought = ?');
    bindings.push(body.is_bought ? 1 : 0);

    if (body.is_bought) {
      updates.push('bought_by = ?', 'bought_at = ?');
      bindings.push(user.id, ts);
    } else {
      updates.push('bought_by = NULL', 'bought_at = NULL');
    }
  }

  // Position reorder
  if (body.position !== undefined) {
    updates.push('position = ?');
    bindings.push(body.position);
  }

  bindings.push(itemId);

  await c.env.DB.prepare(
    `UPDATE list_items SET ${updates.join(', ')} WHERE id = ?`
  )
    .bind(...bindings)
    .run();

  // Update list updated_at
  await c.env.DB.prepare(
    'UPDATE shopping_lists SET updated_at = ? WHERE id = ?'
  )
    .bind(ts, listId)
    .run();

  const updated = await c.env.DB.prepare(
    `SELECT li.*, u.display_name as adder_name, ub.display_name as buyer_name
     FROM list_items li
     LEFT JOIN users u ON u.id = li.added_by
     LEFT JOIN users ub ON ub.id = li.bought_by
     WHERE li.id = ?`
  )
    .bind(itemId)
    .first();

  await notifyDO(c.env.LIST_DO, listId, { type: 'item_updated', payload: updated });

  return c.json(updated);
});

// DELETE /api/v1/lists/:id/items/:itemId
lists.delete('/lists/:id/items/:itemId', async (c) => {
  const user = c.get('user')!;
  const listId = c.req.param('id');
  const itemId = c.req.param('itemId');

  const item = await c.env.DB.prepare(
    `SELECT li.*
     FROM list_items li
     JOIN shopping_lists sl ON sl.id = li.list_id
     WHERE li.id = ? AND li.list_id = ? AND sl.family_id = ?`
  )
    .bind(itemId, listId, user.family_id)
    .first<{ id: string; added_by: string }>();

  if (!item) {
    return c.json({ error: 'Item not found', code: 'NOT_FOUND' }, 404);
  }

  if (item.added_by !== user.id && user.role !== 'admin') {
    return c.json({ error: 'Permission denied', code: 'FORBIDDEN' }, 403);
  }

  await c.env.DB.prepare('DELETE FROM list_items WHERE id = ?')
    .bind(itemId)
    .run();

  const ts = now();
  await c.env.DB.prepare(
    'UPDATE shopping_lists SET updated_at = ? WHERE id = ?'
  )
    .bind(ts, listId)
    .run();

  await notifyDO(c.env.LIST_DO, listId, { type: 'item_deleted', payload: { itemId } });

  return new Response(null, { status: 204 });
});

export default lists;
