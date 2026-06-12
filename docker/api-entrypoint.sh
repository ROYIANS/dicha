#!/bin/sh
set -eu

API_DIR=/app/apps/api
export PATH="/app/node_modules/.bin:${API_DIR}/node_modules/.bin:${PATH}"

echo "[vidorra] syncing database schema (db push)…"
cd "$API_DIR"
prisma db push --accept-data-loss

echo "[vidorra] starting api…"
exec node dist/main.js
