import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { generateUUID, now } from '../utils';

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /api/v1/auth/register
// Validates admin invite code, creates family + admin user atomically
auth.post('/register', async (c) => {
  const user = c.get('user');
  if (user) {
    return c.json({ error: 'Already registered', code: 'ALREADY_REGISTERED' }, 400);
  }

  const email = c.get('userEmail');
  if (!email) {
    return c.json({ error: 'Unauthorized', code: 'NO_EMAIL' }, 401);
  }

  const body = await c.req.json<{ inviteCode?: string; familyName?: string }>();
  const { inviteCode, familyName } = body;

  if (!inviteCode || !familyName?.trim()) {
    return c.json({ error: 'inviteCode and familyName are required', code: 'MISSING_FIELDS' }, 400);
  }

  const ts = now();

  // Look up invite code
  const code = await c.env.DB.prepare(
    'SELECT * FROM admin_invite_codes WHERE code = ? AND used_by IS NULL AND expires_at > ?'
  )
    .bind(inviteCode.trim().toUpperCase(), ts)
    .first<{
      id: string;
      code: string;
      used_by: string | null;
      used_at: number | null;
      expires_at: number;
      created_at: number;
    }>();

  if (!code) {
    return c.json(
      { error: 'This code is invalid or has already been used.', code: 'INVALID_CODE' },
      400
    );
  }

  const familyId = generateUUID();
  const userId = generateUUID();

  // Atomic transaction: create family + user + mark code used
  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO families (id, name, created_by, created_at) VALUES (?, ?, ?, ?)'
    ).bind(familyId, familyName.trim(), email, ts),

    c.env.DB.prepare(
      `INSERT INTO users (id, family_id, email, display_name, role, joined_at, created_at)
       VALUES (?, ?, ?, ?, 'admin', ?, ?)`
    ).bind(userId, familyId, email, email.split('@')[0], ts, ts),

    c.env.DB.prepare(
      'UPDATE admin_invite_codes SET used_by = ?, used_at = ? WHERE id = ?'
    ).bind(userId, ts, code.id),
  ]);

  const newUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first();
  const newFamily = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
    .bind(familyId)
    .first();

  return c.json({ user: newUser, family: newFamily }, 201);
});

// GET /api/v1/auth/me
auth.get('/me', async (c) => {
  const user = c.get('user');
  const email = c.get('userEmail');

  if (user) {
    const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
      .bind(user.family_id)
      .first();
    return c.json({ status: 'ok', user, family });
  }

  // Check for pending invite
  const ts = now();
  const invite = await c.env.DB.prepare(
    `SELECT i.*, f.name as family_name
     FROM invites i
     JOIN families f ON f.id = i.family_id
     WHERE i.email = ? AND i.status = 'pending' AND i.expires_at > ?
     ORDER BY i.created_at DESC
     LIMIT 1`
  )
    .bind(email, ts)
    .first<{ id: string; family_name: string }>();

  if (invite) {
    return c.json({
      status: 'invite_pending',
      invite: { id: invite.id, familyName: invite.family_name },
    });
  }

  return c.json({ status: 'no_access' });
});

// POST /api/v1/auth/accept-invite
// Accept a member invite (called when joining via magic link)
auth.post('/accept-invite', async (c) => {
  const existingUser = c.get('user');
  if (existingUser) {
    return c.json({ error: 'Already registered', code: 'ALREADY_REGISTERED' }, 400);
  }

  const email = c.get('userEmail');
  const body = await c.req.json<{ inviteId?: string }>();
  const { inviteId } = body;

  if (!inviteId) {
    return c.json({ error: 'inviteId is required', code: 'MISSING_FIELDS' }, 400);
  }

  const ts = now();

  const invite = await c.env.DB.prepare(
    `SELECT i.*, u.display_name as inviter_name
     FROM invites i
     LEFT JOIN users u ON u.id = i.invited_by
     WHERE i.id = ? AND i.email = ? AND i.status = 'pending' AND i.expires_at > ?`
  )
    .bind(inviteId, email, ts)
    .first<{
      id: string;
      family_id: string;
      invited_by: string;
      email: string;
      status: string;
      expires_at: number;
      created_at: number;
    }>();

  if (!invite) {
    return c.json(
      { error: 'This invite has expired or is invalid.', code: 'INVALID_INVITE' },
      400
    );
  }

  const userId = generateUUID();

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO users (id, family_id, email, display_name, role, invited_by, joined_at, created_at)
       VALUES (?, ?, ?, ?, 'member', ?, ?, ?)`
    ).bind(
      userId,
      invite.family_id,
      email,
      email.split('@')[0],
      invite.invited_by,
      ts,
      ts
    ),

    c.env.DB.prepare(
      "UPDATE invites SET status = 'accepted' WHERE id = ?"
    ).bind(inviteId),
  ]);

  const newUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first();
  const family = await c.env.DB.prepare('SELECT * FROM families WHERE id = ?')
    .bind(invite.family_id)
    .first();

  return c.json({ user: newUser, family }, 201);
});

export default auth;
