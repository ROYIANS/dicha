#!/bin/sh
set -eu
set -o pipefail 2>/dev/null || true

API_DIR=/app/apps/api
export PATH="/app/node_modules/.bin:${API_DIR}/node_modules/.bin:${PATH}"

run_api() {
  echo "[dicha] syncing database schema (db push)…"
  cd "$API_DIR"
  prisma db push --accept-data-loss

  echo "[dicha] starting api…"
  node dist/main.js
}

if [ -n "${DICHA_RUNTIME_LOG_FILE:-}" ]; then
  mkdir -p "$(dirname "$DICHA_RUNTIME_LOG_FILE")"
  touch "$DICHA_RUNTIME_LOG_FILE"
  run_api 2>&1 | tee -a "$DICHA_RUNTIME_LOG_FILE"
else
  run_api
fi
