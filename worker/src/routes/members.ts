import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { generateUUID, now, sendInviteEmail } from '../utils';

const members = new Hono<{ Bindings: Env; Variables: Variables }>();

// Require authenticated user
members.use('*', async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }
  await next();
});

// GET /api/v1/members
members.get('/members', async (c) => {
  const user = c.get('user')!;
  const isAdmin = user.role === 'admin';

  const membersResult = await c.env.DB.prepare(
    `SELECT id, family_id, display_name, role, joined_at, created_at
     ${isAdmin ? ', email, invited_by' : ''}
     FROM users
     WHERE family_id = ?
     ORDER BY created_at ASC`
  )
    .bind(user.family_id)
    .all();

  const invitesResult = await c.env.DB.prepare(
    `SELECT i.*, u.display_name as inviter_name
     FROM invites i
     LEFT JOIN users u ON u.id = i.invited_by
     WHERE i.family_id = ? AND i.status = 'pending'
     ORDER BY i.created_at DESC`
  )
    .bind(user.family_id)
    .all();

  return c.json({
    members: membersResult.results,
    invites: isAdmin ? invitesResult.results : [],
  });
});

// POST /api/v1/invites — Admin only
members.post('/invites', async (c) => {
  const user = c.get('user')!;
  if (user.role !== 'admin') {
    return c.json({ error: 'Admin only', code: 'FORBIDDEN' }, 403);
  }

  const body = await c.req.json<{ email?: string }>();
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return c.json({ error: 'email is required', code: 'MISSING_FIELDS' }, 400);
  }

  const ts = now();

  // Check if already a member
  const existingUser = await c.env.DB.prepare(
    'SELECT id FROM users WHERE email = ? AND family_id = ?'
  )
    .bind(email, user.family_id)
    .first();

  if (existingUser) {
    return c.json({ error: 'This person is already a member', code: 'ALREADY_MEMBER' }, 400);
  }

  // Check for existing pending invite
  const existingInvite = await c.env.DB.prepare(
    "SELECT id FROM invites WHERE email = ? AND family_id = ? AND status = 'pending'"
  )
    .bind(email, user.family_id)
    .first();

  if (existingInvite) {
    return c.json(
      { error: 'A pending invite already exists for this email', code: 'INVITE_EXISTS' },
      400
    );
  }

  const inviteId = generateUUID();
  const expiresAt = ts + 48 * 60 * 60; // 48 hours

  await c.env.DB.prepare(
    'INSERT INTO invites (id, family_id, invited_by, email, status, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(inviteId, user.family_id, user.id, email, 'pending', expiresAt, ts)
    .run();

  // Get family name for email
  const family = await c.env.DB.prepare('SELECT name FROM families WHERE id = ?')
    .bind(user.family_id)
    .first<{ name: string }>();

  try {
    console.log('Sending invite email to:', email, 'RESEND_API_KEY set:', !!c.env.RESEND_API_KEY);
    await sendInviteEmail(
      c.env.RESEND_API_KEY,
      c.env.APP_URL,
      email,
      inviteId,
      family?.name || 'your family',
      user.display_name
    );
    console.log('Invite email sent successfully');
  } catch (err) {
    console.error('Failed to send invite email:', err);
  }

  const invite = await c.env.DB.prepare('SELECT * FROM invites WHERE id = ?')
    .bind(inviteId)
    .first();

  return c.json(invite, 201);
});

// POST /api/v1/invites/:id/resend — Admin only
members.post('/invites/:id/resend', async (c) => {
  const user = c.get('user')!;
  if (user.role !== 'admin') {
    return c.json({ error: 'Admin only', code: 'FORBIDDEN' }, 403);
  }

  const inviteId = c.req.param('id');

  const invite = await c.env.DB.prepare(
    "SELECT * FROM invites WHERE id = ? AND family_id = ? AND status = 'pending'"
  )
    .bind(inviteId, user.family_id)
    .first<{ id: string; email: string; expires_at: number }>();

  if (!invite) {
    return c.json({ error: 'Invite not found', code: 'NOT_FOUND' }, 404);
  }

  const family = await c.env.DB.prepare('SELECT name FROM families WHERE id = ?')
    .bind(user.family_id)
    .first<{ name: string }>();

  try {
    await sendInviteEmail(
      c.env.RESEND_API_KEY,
      c.env.APP_URL,
      invite.email,
      invite.id,
      family?.name || 'your family',
      user.display_name
    );
  } catch (err) {
    console.error('Failed to resend invite email:', err);
    return c.json({ error: 'Failed to send email', code: 'EMAIL_FAILED' }, 500);
  }

  return c.json({ success: true });
});

// DELETE /api/v1/invites/:id — Admin only
members.delete('/invites/:id', async (c) => {
  const user = c.get('user')!;
  if (user.role !== 'admin') {
    return c.json({ error: 'Admin only', code: 'FORBIDDEN' }, 403);
  }

  const inviteId = c.req.param('id');

  const result = await c.env.DB.prepare(
    "UPDATE invites SET status = 'revoked' WHERE id = ? AND family_id = ? AND status = 'pending'"
  )
    .bind(inviteId, user.family_id)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Invite not found', code: 'NOT_FOUND' }, 404);
  }

  return new Response(null, { status: 204 });
});

// DELETE /api/v1/members/:userId — Admin only
members.delete('/members/:userId', async (c) => {
  const user = c.get('user')!;
  if (user.role !== 'admin') {
    return c.json({ error: 'Admin only', code: 'FORBIDDEN' }, 403);
  }

  const targetId = c.req.param('userId');

  if (targetId === user.id) {
    return c.json({ error: 'You cannot remove yourself', code: 'CANNOT_REMOVE_SELF' }, 400);
  }

  const result = await c.env.DB.prepare(
    'DELETE FROM users WHERE id = ? AND family_id = ?'
  )
    .bind(targetId, user.family_id)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Member not found', code: 'NOT_FOUND' }, 404);
  }

  return new Response(null, { status: 204 });
});

export default members;
