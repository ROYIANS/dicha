#!/bin/sh
set -eu

cd /app

echo "[vidorra] applying database migrations…"
pnpm --filter @vidorra/api run prisma:deploy

echo "[vidorra] starting api…"
cd /app/apps/api
exec node dist/main.js
