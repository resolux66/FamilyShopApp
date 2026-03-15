import { Hono } from 'hono';
import type { Env, Variables } from '../types';

const demo = new Hono<{ Bindings: Env; Variables: Variables }>();

function base64url(str: string): string {
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function signDemoJWT(secret: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 86400; // 24 hours

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({ email: 'demo@familycart.app', demo: true, iat, exp })
  );

  const data = `${header}.${payload}`;
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

// POST /api/v1/auth/demo — no auth middleware required
demo.post('/demo', async (c) => {
  const token = await signDemoJWT(c.env.DEMO_SECRET);
  return c.json({ token });
});

export default demo;
