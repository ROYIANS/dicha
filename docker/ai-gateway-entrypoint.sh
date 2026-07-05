#!/bin/sh
set -eu
set -o pipefail 2>/dev/null || true

APP_DIR=/app/apps/ai-gateway

run_gateway() {
  cd "$APP_DIR"
  echo "[dicha] starting ai-gateway..."
  node dist/main.js
}

if [ -n "${AI_GATEWAY_RUNTIME_LOG_FILE:-}" ]; then
  mkdir -p "$(dirname "$AI_GATEWAY_RUNTIME_LOG_FILE")"
  touch "$AI_GATEWAY_RUNTIME_LOG_FILE"
  run_gateway 2>&1 | tee -a "$AI_GATEWAY_RUNTIME_LOG_FILE"
else
  run_gateway
fi
