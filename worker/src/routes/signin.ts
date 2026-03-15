import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { now } from '../utils';

const signin = new Hono<{ Bindings: Env; Variables: Variables }>();

function base64url(str: string): string {
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function signJWT(
  secret: string,
  payload: Record<string, unknown>,
  expiresInSeconds: number
): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, iat, exp }));
  const data = `${header}.${body}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigBase64url = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${sigBase64url}`;
}

async function verifyJWT(
  token: string,
  secret: string
): Promise<Record<string, unknown>> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');

  const data = `${parts[0]}.${parts[1]}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const sigStr = parts[2].replace(/-/g, '+').replace(/_/g, '/');
  const sigPad = sigStr + '='.repeat((4 - (sigStr.length % 4)) % 4);
  const sigBytes = Uint8Array.from(atob(sigPad), (c) => c.charCodeAt(0));

  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
  if (!valid) throw new Error('Invalid signature');

  const payloadStr = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const payloadPad = payloadStr + '='.repeat((4 - (payloadStr.length % 4)) % 4);
  return JSON.parse(atob(payloadPad));
}

function errorPage(appUrl: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Sign In Failed</title>
  <style>
    body { font-family: sans-serif; max-width: 480px; margin: 80px auto; padding: 0 24px; text-align: center; }
    h1 { color: #dc2626; }
    a { color: #16a34a; }
  </style>
</head>
<body>
  <h1>Sign In Failed</h1>
  <p>${message}</p>
  <a href="${appUrl}">← Back to FamilyCart</a>
</body>
</html>`;
}

// POST /api/v1/auth/signin/request
signin.post('/signin/request', async (c) => {
  const body = await c.req.json<{ email?: string }>();
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return c.json({ error: 'email is required', code: 'MISSING_FIELDS' }, 400);
  }

  const ts = now();

  // Check if user exists or has a pending invite
  const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first();

  const invite = !user
    ? await c.env.DB.prepare(
        "SELECT id FROM invites WHERE email = ? AND status = 'pending' AND expires_at > ?"
      )
        .bind(email, ts)
        .first()
    : null;

  // Silently succeed even if email not found (don't reveal existence)
  if (!user && !invite) {
    return c.json({ ok: true });
  }

  // Sign a 15-minute magic token
  const magicToken = await signJWT(c.env.DEMO_SECRET, { type: 'magic', email }, 15 * 60);

  // Construct verify URL from the incoming request host
  const reqUrl = new URL(c.req.url);
  const verifyUrl = `${reqUrl.protocol}//${reqUrl.host}/api/v1/auth/signin/verify?token=${magicToken}`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FamilyCart <onboarding@resend.dev>',
      to: [email],
      subject: 'Sign in to FamilyCart',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h1 style="color:#16a34a;margin-bottom:8px;">FamilyCart</h1>
          <p style="color:#374151;font-size:16px;">
            Click the button below to sign in. This link expires in 15 minutes.
          </p>
          <div style="margin:32px 0;">
            <a href="${verifyUrl}"
               style="background-color:#16a34a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;">
              Sign in to FamilyCart
            </a>
          </div>
          <p style="color:#6b7280;font-size:14px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Failed to send magic link email:', response.status, text);
    return c.json({ error: 'Failed to send email', code: 'EMAIL_FAILED' }, 500);
  }

  return c.json({ ok: true });
});

// GET /api/v1/auth/signin/verify?token=...
signin.get('/signin/verify', async (c) => {
  const token = c.req.query('token');
  if (!token) {
    return c.html(errorPage(c.env.APP_URL, 'Missing token.'), 400);
  }

  try {
    const payload = await verifyJWT(token, c.env.DEMO_SECRET);
    if (payload.type !== 'magic') throw new Error('Invalid token type');

    const exp = payload.exp as number;
    if (exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');

    const email = payload.email as string;

    // Issue a 7-day session JWT
    const sessionJWT = await signJWT(
      c.env.DEMO_SECRET,
      { type: 'session', email },
      7 * 24 * 60 * 60
    );

    return c.redirect(`${c.env.APP_URL}/?session=${sessionJWT}`);
  } catch {
    return c.html(
      errorPage(
        c.env.APP_URL,
        'This sign-in link has expired or is invalid. Please request a new one.'
      ),
      400
    );
  }
});

export default signin;
