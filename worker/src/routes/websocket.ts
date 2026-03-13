import { Hono } from 'hono';
import type { Env, Variables } from '../types';

const ws = new Hono<{ Bindings: Env; Variables: Variables }>();

// Require authenticated user
ws.use('*', async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }
  await next();
});

// GET /api/v1/lists/:id/ws — WebSocket upgrade
ws.get('/lists/:id/ws', async (c) => {
  const user = c.get('user')!;
  const listId = c.req.param('id');

  // Verify list belongs to user's family
  const list = await c.env.DB.prepare(
    'SELECT id FROM shopping_lists WHERE id = ? AND family_id = ?'
  )
    .bind(listId, user.family_id)
    .first();

  if (!list) {
    return c.json({ error: 'List not found', code: 'NOT_FOUND' }, 404);
  }

  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade', code: 'UPGRADE_REQUIRED' }, 426);
  }

  const doId = c.env.LIST_DO.idFromName(listId);
  const stub = c.env.LIST_DO.get(doId);

  // Forward WebSocket upgrade to Durable Object
  return stub.fetch(new Request('http://do/connect', c.req.raw));
});

export default ws;
