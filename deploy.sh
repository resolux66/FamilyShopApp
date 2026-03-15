#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> Deploying worker..."
cd "$ROOT/worker"
npm install
npx wrangler deploy

echo "==> Building frontend..."
cd "$ROOT/frontend"
npm install
npm run build

echo "==> Deploying frontend..."
npx wrangler pages deploy dist --project-name familycart

echo "==> Done!"
