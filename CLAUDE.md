# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Worker (`cd worker`)
```bash
npx wrangler dev                                                        # local dev server
npx wrangler deploy                                                     # deploy to Cloudflare
npx wrangler d1 execute familycart-db --file=./schema.sql --remote     # apply schema to production
npx wrangler d1 execute familycart-db --file=./schema.sql --local      # apply schema locally
npx wrangler tail                                                       # stream live logs
```

### Frontend (`cd frontend`)
```bash
npm run dev      # local dev server (proxies /api to localhost:8787)
npm run build    # tsc + vite production build
```

### Deploy frontend
```bash
npm run build && npx wrangler pages deploy dist --project-name familycart
```

## Architecture

### Overview
Two separate deployments: a **Cloudflare Worker** (REST API + WebSocket) and a **Cloudflare Pages** app (React SPA). The frontend calls the worker at `https://api.familycart.jozefmrazik.co.uk` (configured via `VITE_WORKER_URL` in `frontend/.env.production`).

### Worker (`worker/src/`)
- **Framework**: Hono — routes are split into `src/routes/` (auth, lists, members, users, superadmin, websocket) and mounted in `src/index.ts`
- **Auth middleware** (`src/auth.ts`): Runs on all `/api/v1/*` routes. Decodes the `Cf-Access-Jwt-Assertion` JWT header (Cloudflare Access injects this), extracts the email claim, and loads the user from D1. Sets `c.get('user')` and `c.get('userEmail')` for downstream handlers.
- **Durable Objects** (`src/durable-objects/ListDO.ts`): One DO instance per shopping list (keyed by list ID). Maintains WebSocket connections and broadcasts mutations to all connected clients. After any mutation in `lists.ts`, call `notifyDO()` to push the update.
- **Super-admin routes** (`src/routes/superadmin.ts`): Bypass the auth middleware entirely — use `X-SuperAdmin-Key` header instead.

### Family isolation — critical rule
**Every D1 query that touches family data must include `AND family_id = ?`** using `user.family_id`. This is the only isolation mechanism. There is no exception.

### Frontend (`frontend/src/`)
- **Auth flow**: `AuthContext` calls `GET /auth/me` on load. Returns one of: `ok` (user exists), `invite_pending` (pending invite found for email), `no_access` (403 page), `setup_needed` (no user, no invite → `/setup`). `App.tsx` guards routes based on this status.
- **State**: React Context for auth/user identity. TanStack Query v5 for all server state (`queryKey: ['lists']`, `['list', id]`, `['members']`, `['stats']`).
- **Real-time**: `useWebSocket` hook connects to `/api/v1/lists/:id/ws`. On message, patches the React Query cache directly. Falls back to polling every 10s if WebSocket fails (cross-origin limitation).
- **API client** (`src/api/client.ts`): Reads the Cloudflare Access JWT from the `CF_Authorization` cookie and forwards it as `Cf-Access-Jwt-Assertion` header on every request.

### Auth & onboarding flows
1. **New family admin**: No user in DB → `/setup` → enter admin invite code + family name → `POST /auth/register` → atomically creates family + user + marks code used → `/welcome` to set display name
2. **New member**: Pending invite in DB → `/join?token=` → `POST /auth/accept-invite` → creates user, marks invite accepted → `/welcome`
3. **Returning user**: User found in DB → dashboard

### Permissions
- **Admin only**: invite/remove members, rename/delete any list, delete any item
- **Creator or admin**: rename/delete own list, edit/delete own item
- **Any member**: create lists, add items, toggle shopping mode, tick/untick items
- **Super-admin**: `X-SuperAdmin-Key` header required; no UI, curl only

### Worker bindings (`wrangler.toml`)
- `DB` — D1 database (`familycart-db`)
- `LIST_DO` — Durable Object namespace (`ListDO`)
- `APP_URL` — set as `[vars]`, value: `https://familycart.jozefmrazik.co.uk`
- Secrets (set via `wrangler secret put`): `RESEND_API_KEY`, `SUPERADMIN_KEY`, `CF_ACCESS_TEAM_DOMAIN`
