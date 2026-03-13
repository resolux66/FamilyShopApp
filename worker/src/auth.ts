import type { Context, MiddlewareHandler } from 'hono';
import type { Env, Variables } from './types';

function decodeJWTPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
  const decoded = atob(padded);
  return JSON.parse(decoded);
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
  try {
    const payload = decodeJWTPayload(jwt);
    email = (payload.email as string) || (payload.sub as string);
    if (!email) throw new Error('No email in JWT');

    // Check expiry
    const exp = payload.exp as number | undefined;
    if (exp && exp < Math.floor(Date.now() / 1000)) {
      return c.json({ error: 'JWT expired', code: 'JWT_EXPIRED' }, 401);
    }
  } catch {
    return c.json({ error: 'Invalid JWT', code: 'INVALID_JWT' }, 401);
  }

  c.set('userEmail', email);

  // Look up user
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first();

  c.set('user', user as Variables['user']);
  await next();
};
