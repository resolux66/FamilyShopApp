import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { generateUUID, generateCode, now } from '../utils';

const superadmin = new Hono<{ Bindings: Env; Variables: Variables }>();

// Super-admin auth middleware
superadmin.use('*', async (c, next) => {
  const key = c.req.header('X-SuperAdmin-Key');
  if (!key || key !== c.env.SUPERADMIN_KEY) {
    return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403);
  }
  await next();
});

// GET /api/v1/superadmin/invite-codes
superadmin.get('/invite-codes', async (c) => {
  const codes = await c.env.DB.prepare(
    'SELECT * FROM admin_invite_codes ORDER BY created_at DESC'
  ).all();
  return c.json(codes.results);
});

// POST /api/v1/superadmin/invite-codes
superadmin.post('/invite-codes', async (c) => {
  const ts = now();
  const id = generateUUID();
  const code = generateCode();
  const expiresAt = ts + 7 * 24 * 60 * 60; // 7 days

  await c.env.DB.prepare(
    'INSERT INTO admin_invite_codes (id, code, expires_at, created_at) VALUES (?, ?, ?, ?)'
  )
    .bind(id, code, expiresAt, ts)
    .run();

  const record = await c.env.DB.prepare(
    'SELECT * FROM admin_invite_codes WHERE id = ?'
  )
    .bind(id)
    .first();

  return c.json(record, 201);
});

// GET /api/v1/superadmin/families
superadmin.get('/families', async (c) => {
  const families = await c.env.DB.prepare(
    `SELECT f.*, COUNT(u.id) as member_count
     FROM families f
     LEFT JOIN users u ON u.family_id = f.id
     GROUP BY f.id
     ORDER BY f.created_at DESC`
  ).all();
  return c.json(families.results);
});

export default superadmin;
