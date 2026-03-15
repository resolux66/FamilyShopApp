import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, Variables } from './types';
import { authMiddleware } from './auth';
import { ListDO } from './durable-objects/ListDO';
import authRoutes from './routes/auth';
import demoRoutes from './routes/demo';
import signinRoutes from './routes/signin';
import superadminRoutes from './routes/superadmin';
import memberRoutes from './routes/members';
import listRoutes from './routes/lists';
import userRoutes from './routes/users';
import wsRoutes from './routes/websocket';
import { handleCron } from './cron';

export { ListDO };

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS
app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: [
      'Content-Type',
      'Cf-Access-Jwt-Assertion',
      'X-SuperAdmin-Key',
    ],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// Super-admin routes — no auth middleware (they use their own key check)
app.route('/api/v1/superadmin', superadminRoutes);

// Demo login — no auth middleware required
app.route('/api/v1/auth', demoRoutes);

// Magic link sign-in — no auth middleware required
app.route('/api/v1/auth', signinRoutes);

// Apply auth middleware to all /api/v1/* routes
app.use('/api/v1/*', authMiddleware);

// Mount routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1', memberRoutes);
app.route('/api/v1', listRoutes);
app.route('/api/v1', userRoutes);
app.route('/api/v1', wsRoutes);

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// 404 fallback
app.notFound((c) => c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404));

export default {
  fetch: app.fetch.bind(app),
  scheduled: handleCron,
};
