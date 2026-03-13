# FamilyCart

A multi-family collaborative shopping list app built on Cloudflare's free tier.

## Stack

- **Frontend**: React 18 + React Router v6 + TanStack Query v5 + Tailwind CSS + Vite
- **Backend**: Cloudflare Worker (Hono) + D1 (SQLite) + Durable Objects (WebSocket)
- **Auth**: Cloudflare Access (OTP email)
- **Email**: Resend API
- **Deployment**: Cloudflare Pages (frontend) + Cloudflare Workers (API)

---

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)
- A [Cloudflare account](https://dash.cloudflare.com) (free tier)
- A [Resend account](https://resend.com) (free tier) for email

---

## Deployment Steps

### 1. Authenticate with Cloudflare

```bash
wrangler login
```

### 2. Create a D1 Database

```bash
wrangler d1 create familycart-db
```

Copy the `database_id` from the output and update `worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "familycart-db"
database_id = "YOUR_D1_DATABASE_ID_HERE"
```

### 3. Apply the Database Schema

```bash
cd worker
wrangler d1 execute familycart-db --file=./schema.sql
```

### 4. Configure Worker Secrets

```bash
cd worker
wrangler secret put RESEND_API_KEY
# Enter your Resend API key from https://resend.com/api-keys

wrangler secret put SUPERADMIN_KEY
# Enter a strong random string (e.g. openssl rand -hex 32)

wrangler secret put CF_ACCESS_TEAM_DOMAIN
# Enter your Cloudflare Access team domain (e.g. myfamily.cloudflareaccess.com)
```

> **Note:** `APP_URL` will be set after the first Pages deployment.

### 5. Deploy the Worker

```bash
cd worker
npm install
wrangler deploy
```

Note the Worker URL (e.g. `https://familycart-worker.your-account.workers.dev`).

### 6. Deploy the Frontend

```bash
cd frontend
npm install
npm run build
wrangler pages deploy dist --project-name familycart
```

Note the Pages URL (e.g. `https://familycart.pages.dev`).

### 7. Set APP_URL Secret

```bash
cd worker
wrangler secret put APP_URL
# Enter your Pages URL, e.g.: https://familycart.pages.dev
```

### 8. Configure Cloudflare Access

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com)
2. Navigate to **Access → Applications → Add an application**
3. Choose **Self-hosted**
4. Configure:
   - **Application name**: FamilyCart
   - **Session duration**: 24 hours
   - **Application domain**: `familycart.pages.dev` (your Pages URL)
5. Add a policy:
   - **Policy name**: Allow OTP
   - **Action**: Allow
   - **Rule**: Everyone (or restrict to specific email domains)
6. Under **Login methods**, enable **One-time PIN**
7. Save the application

> The team domain (e.g. `myfamily.cloudflareaccess.com`) is shown in Zero Trust → Settings → Custom Pages or in the URL bar.

### 9. Update Worker CORS (if needed)

If your Worker and Pages are on different domains, ensure the `APP_URL` in `wrangler.toml` matches your Pages URL.

---

## Super-Admin Operations

All super-admin operations require the `X-SuperAdmin-Key` header.

### Generate an Admin Invite Code

```bash
curl -X POST https://familycart-worker.your-account.workers.dev/api/v1/superadmin/invite-codes \
  -H "X-SuperAdmin-Key: YOUR_SUPERADMIN_KEY" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "id": "uuid",
  "code": "ABC123DEF456",
  "expires_at": 1720000000,
  "created_at": 1719395200
}
```

### List All Invite Codes

```bash
curl https://familycart-worker.your-account.workers.dev/api/v1/superadmin/invite-codes \
  -H "X-SuperAdmin-Key: YOUR_SUPERADMIN_KEY"
```

**Response:**
```json
[
  {
    "id": "uuid",
    "code": "ABC123DEF456",
    "used_by": null,
    "used_at": null,
    "expires_at": 1720000000,
    "created_at": 1719395200
  }
]
```

### List All Families

```bash
curl https://familycart-worker.your-account.workers.dev/api/v1/superadmin/families \
  -H "X-SuperAdmin-Key: YOUR_SUPERADMIN_KEY"
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "The Smiths",
    "created_by": "admin@example.com",
    "created_at": 1719395200,
    "member_count": 4
  }
]
```

---

## New Family Setup (Admin Flow)

1. Super-admin generates an invite code (see above) and shares it with the new family admin.
2. Admin visits `https://familycart.pages.dev` and authenticates via OTP email.
3. They're shown the **Create Your Family** screen (`/setup`).
4. They enter the invite code and a family name, then click **Create Family**.
5. They're redirected to `/welcome` to set their display name.
6. They land on the dashboard and can start inviting family members.

---

## Member Invite Flow

1. Admin visits `/members` and enters a member's email address.
2. The member receives an email: *"You've been invited to join [Family Name] on FamilyCart. Click here to accept."*
3. Member clicks the link, authenticates via OTP, and is redirected to `/welcome` to set their display name.
4. Member lands on the family dashboard.

---

## Local Development

### Worker (API)

```bash
cd worker
npm install
wrangler dev --local
# API runs on http://localhost:8787
```

Create a local D1 database for development:

```bash
wrangler d1 execute familycart-db --local --file=./schema.sql
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
# Proxies /api/* to http://localhost:8787
```

> **Local Auth Note:** Cloudflare Access is not active in local development. The Worker's auth middleware reads the `Cf-Access-Jwt-Assertion` header. For local testing, you can temporarily bypass auth or use `wrangler dev --test-scheduled`.

---

## Environment Variables Reference

### Worker Secrets (via `wrangler secret put`)

| Secret | Description |
|--------|-------------|
| `RESEND_API_KEY` | From [resend.com/api-keys](https://resend.com/api-keys) |
| `SUPERADMIN_KEY` | Strong random string for super-admin API access |
| `APP_URL` | Your Cloudflare Pages URL (set after first deployment) |
| `CF_ACCESS_TEAM_DOMAIN` | Your Cloudflare Access team domain |

### Worker Bindings (in `wrangler.toml`)

| Binding | Type | Description |
|---------|------|-------------|
| `DB` | D1 Database | Main SQLite database |
| `LIST_DO` | Durable Object | WebSocket hub per shopping list |

---

## Architecture Notes

- **Family isolation**: Every D1 query includes `AND family_id = ?` using the authenticated user's `family_id`. No exceptions.
- **Real-time**: Each shopping list has one Durable Object instance (keyed by list ID). WebSocket clients connect through the Worker to the DO. Updates broadcast to all connected clients in < 500ms.
- **Fallback polling**: If WebSocket connection fails, the frontend polls `GET /api/v1/lists/:id` every 10 seconds.
- **Auth**: Cloudflare Access validates OTP and injects a JWT. The Worker reads identity from the `Cf-Access-Jwt-Assertion` header — identity is never derived from request body or query params.

---

## Acceptance Criteria Checklist

- [x] AC-1: Super-admin generates invite code via curl
- [x] AC-2: Admin redeems code, creates family, code cannot be reused
- [x] AC-3: Admin invites member via email, branded 48-hour link
- [x] AC-4: Complete family isolation between Family A and Family B
- [x] AC-5: List appears on dashboard with creator's display name
- [x] AC-6: Members cannot see edit/delete controls for others' items
- [x] AC-7: Real-time item tick via WebSocket < 500ms
- [x] AC-8: "Remove bought items" on shopping end deletes only ticked items
- [x] AC-9: Print view shows clean page with nav hidden and QR code
- [x] AC-10: Removed member gets 403 on next API request
- [x] AC-11: All endpoints return 403 for expired/invalid JWTs
- [x] AC-12: Fully functional at 375px viewport
- [x] AC-13: New member prompted for display name at /welcome before dashboard
