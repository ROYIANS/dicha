#!/bin/sh
set -eu

API_DIR=/app/apps/api
export PATH="/app/node_modules/.bin:${API_DIR}/node_modules/.bin:${PATH}"

echo "[vidorra] applying database migrations…"
cd "$API_DIR"
prisma migrate deploy

echo "[vidorra] starting api…"
exec node dist/main.js
