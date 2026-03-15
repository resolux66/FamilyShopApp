import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from './types';

function decodeBase64url(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4);
  return atob(padded);
}

function decodeJWTPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  return JSON.parse(decodeBase64url(parts[1]));
}

async function verifyDemoJWT(token: string, secret: string): Promise<Record<string, unknown>> {
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

  return JSON.parse(decodeBase64url(parts[1]));
}

export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (
  c,
  next
) => {
  const jwt = c.req.header('Cf-Access-Jwt-Assertion');

  if (!jwt) {
    return c.json({ error: 'Unauthorized', code: 'NO_JWT' }, 401);
  }

  let email: string;
  let isDemo = false;

  try {
    // Peek at the JWT header to determine algorithm
    const headerStr = decodeBase64url(jwt.split('.')[0]);
    const header = JSON.parse(headerStr);

    if (header.alg === 'HS256') {
      // Demo or session JWT — verify HMAC-SHA256 signature with DEMO_SECRET
      const payload = await verifyDemoJWT(jwt, c.env.DEMO_SECRET);
      email = payload.email as string;
      const exp = payload.exp as number | undefined;
      if (exp && exp < Math.floor(Date.now() / 1000)) {
        return c.json({ error: 'JWT expired', code: 'JWT_EXPIRED' }, 401);
      }
      if (payload.demo) {
        isDemo = true;
      } else if (payload.type !== 'session') {
        throw new Error('Unknown HS256 token type');
      }
    } else {
      // CF Access JWT — decode payload without signature verification (CF handles that at the edge)
      const payload = decodeJWTPayload(jwt);
      email = (payload.email as string) || (payload.sub as string);
      if (!email) throw new Error('No email in JWT');
      const exp = payload.exp as number | undefined;
      if (exp && exp < Math.floor(Date.now() / 1000)) {
        return c.json({ error: 'JWT expired', code: 'JWT_EXPIRED' }, 401);
      }
    }
  } catch {
    return c.json({ error: 'Invalid JWT', code: 'INVALID_JWT' }, 401);
  }

  c.set('userEmail', email);
  c.set('isDemo', isDemo);

  // Look up user
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first();

  c.set('user', user as Variables['user']);
  await next();
};
