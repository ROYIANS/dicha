#!/usr/bin/env bash
# vidorra one-click self-hosted deploy (Linux / macOS / Git Bash)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}▸${NC} $*"; }
warn()  { echo -e "${YELLOW}▸${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "Docker is not installed. See https://docs.docker.com/get-docker/"

if ! docker compose version >/dev/null 2>&1; then
  fail "Docker Compose v2 plugin not found (need \`docker compose\`)."
fi

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    warn "Created .env from .env.example — edit POSTGRES_PASSWORD before production use."
  else
    fail "Missing .env and .env.example"
  fi
fi

# shellcheck disable=SC1091
set -a && source .env && set +a

WEB_PORT="${WEB_PORT:-8080}"

info "Building images and starting stack…"
docker compose up -d --build --remove-orphans

info "Waiting for services to become healthy…"
deadline=$((SECONDS + 180))
while (( SECONDS < deadline )); do
  unhealthy="$(docker compose ps --format json 2>/dev/null | grep -c '"Health":"unhealthy"' || true)"
  starting="$(docker compose ps --format json 2>/dev/null | grep -c '"Health":"starting"' || true)"
  if [[ "$unhealthy" -gt 0 ]]; then
    docker compose ps
    fail "One or more services are unhealthy. Check logs: docker compose logs"
  fi
  if [[ "$starting" -eq 0 ]]; then
    break
  fi
  sleep 3
done

echo ""
info "vidorra is up."
echo "  App:  http://localhost:${WEB_PORT}/"
echo "  API:  http://localhost:${WEB_PORT}/api/health"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f          # follow logs"
echo "  docker compose ps               # service status"
echo "  docker compose down             # stop stack"
echo "  docker compose build --no-cache   # force full rebuild"
