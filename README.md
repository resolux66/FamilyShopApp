# FamilyCart

A collaborative shopping list web app for families. Each family gets their own private space to create and manage shopping lists together in real time.
You can find live version on: https://familycart.jozefmrazik.co.uk

## Features

- **Invite-only families** — controlled access via invite links
- **Collaborative lists** — multiple members can add, edit and reorder items
- **Shopping mode** — tick off items as you shop, with live updates for everyone
- **Real-time sync** — changes appear instantly across all devices
- **Print & PDF** — clean print view with QR code linking back to the live list
- **Member management** — admin can invite and remove members
- **Mobile friendly** — works on phones and tablets

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, TanStack Query v5 |
| Backend | Cloudflare Workers, Hono |
| Database | Cloudflare D1 (SQLite) |
| Real-time | Cloudflare Durable Objects (WebSocket) |
| Auth | Cloudflare Access (OTP email) |
| Hosting | Cloudflare Pages + Workers (free tier) |

## Project Structure

```
├── frontend/          # React SPA deployed to Cloudflare Pages
│   └── src/
│       ├── pages/     # Dashboard, ListDetail, Members, Profile, etc.
│       ├── components/
│       ├── hooks/
│       └── api/
└── worker/            # Cloudflare Worker — REST API + WebSocket
    ├── src/
    │   ├── routes/    # auth, lists, members, superadmin
    │   └── durable-objects/
    └── schema.sql     # D1 database schema
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) — `npm install -g wrangler`
- A [Cloudflare account](https://dash.cloudflare.com) (free tier)

### Setup

```bash
# Install dependencies
cd worker && npm install
cd ../frontend && npm install

# Create D1 database
cd ../worker
npx wrangler d1 create familycart-db
# Paste the database_id into wrangler.toml

# Apply schema
npx wrangler d1 execute familycart-db --file=./schema.sql --remote

# Set secrets
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put SUPERADMIN_KEY
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN

# Deploy worker
npx wrangler deploy

# Deploy frontend
cd ../frontend
npm run build
npx wrangler pages deploy dist --project-name familycart
```

### Generate the first admin invite code

```bash
curl -X POST https://your-worker.workers.dev/api/v1/superadmin/invite-codes \
  -H "X-SuperAdmin-Key: YOUR_SUPERADMIN_KEY"
```

Visit your app URL, log in with OTP, and enter the invite code to create your family.

## License

MIT
