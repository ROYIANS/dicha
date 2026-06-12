#!/usr/bin/env bash
# vidorra one-click self-hosted deploy (Linux / macOS / Git Bash)
#
# Images are built in CI (GitHub Actions) and pushed to GHCR on every push to main.
# This script pulls those prebuilt images and (re)starts the stack — no local build.
#
# Safe to run repeatedly:
#   First run  — creates .env, pulls images, starts (empty DB volume)
#   Later runs — pulls latest images, recreates containers (DB kept)
#   --fresh    — also removes volumes (blank database)
#   --build    — build images locally instead of pulling from GHCR
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

FRESH=0
DOWN=0
LOGS=0
BUILD=0

for arg in "$@"; do
  case "$arg" in
    --fresh|-Fresh) FRESH=1 ;;
    --down|-Down)   DOWN=1 ;;
    --logs|-Logs)   LOGS=1 ;;
    --build|-Build) BUILD=1 ;;
    -h|--help)
      cat <<'EOF'
Usage: ./deploy.sh [--fresh] [--down] [--logs] [--build]

  (default)  Pull prebuilt images from GHCR and recreate the stack (DB kept)
  --fresh    Wipe volumes too — blank database
  --build    Build images locally instead of pulling from GHCR
  --down     Stop stack only
  --logs     Follow service logs
EOF
      exit 0
      ;;
    *)
      fail "Unknown option: $arg (try --help)"
      ;;
  esac
done

command -v docker >/dev/null 2>&1 || fail "Docker is not installed. See https://docs.docker.com/get-docker/"

if ! docker compose version >/dev/null 2>&1; then
  fail "Docker Compose v2 plugin not found (need \`docker compose\`)."
fi

if [[ "$DOWN" -eq 1 ]]; then
  info "Stopping vidorra stack…"
  docker compose down --remove-orphans
  exit 0
fi

if [[ "$LOGS" -eq 1 ]]; then
  docker compose logs -f
  exit 0
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

if [[ "$FRESH" -eq 1 ]]; then
  warn "Fresh deploy: removing containers and volumes (database will be wiped)…"
  docker compose down -v --remove-orphans
else
  info "Stopping existing containers (keeping database volume)…"
  docker compose down --remove-orphans
fi

if [[ "$BUILD" -eq 1 ]]; then
  info "Removing dangling images from previous builds…"
  docker image prune -f >/dev/null
  info "Building api + web images locally (no cache)…"
  docker compose build --no-cache
else
  info "Pulling prebuilt images from ${IMAGE_PREFIX:-ghcr.io/royians/vidorra} (tag: ${IMAGE_TAG:-latest})…"
  docker compose pull api web
fi

info "Starting stack with recreated containers…"
docker compose up -d --force-recreate --remove-orphans

info "Waiting for services to become healthy…"
deadline=$((SECONDS + 300))
while (( SECONDS < deadline )); do
  unhealthy="$(docker compose ps --format json 2>/dev/null | grep -c '"Health":"unhealthy"' || true)"
  starting="$(docker compose ps --format json 2>/dev/null | grep -c '"Health":"starting"' || true)"
  if [[ "$unhealthy" -gt 0 ]]; then
    docker compose ps
    fail "One or more services are unhealthy. Check logs: ./deploy.sh --logs"
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
echo "  ./deploy.sh              # pull latest images + redeploy (keeps DB)"
echo "  ./deploy.sh --build      # build images locally instead of pulling"
echo "  ./deploy.sh --fresh      # wipe DB + redeploy from scratch"
echo "  ./deploy.sh --logs       # follow logs"
echo "  ./deploy.sh --down       # stop stack"
