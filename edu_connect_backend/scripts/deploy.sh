#!/usr/bin/env bash
set -euo pipefail

# EduConnect production deployment script.
# Run on the VPS after copying .env.production and the secrets/ directory.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
compose() { docker compose --env-file .env.production -f docker-compose.yml "$@"; }

info "Running preflight checks..."

[[ -f ".env.production" ]] || error ".env.production not found. Copy .env.production.example and fill it in."
[[ -f "secrets/private_key.pem" ]] || error "secrets/private_key.pem missing. Run: python manage.py generate-keys"
[[ -f "secrets/public_key.pem" ]] || error "secrets/public_key.pem missing. Run: python manage.py generate-keys"

set -a
source .env.production
set +a

if grep -Eq "REPLACE_WITH_|YOUR_" .env.production; then
    error ".env.production still contains placeholder values."
fi

[[ "${APP_ENV:-}" == "production" ]] || error "APP_ENV must be production."
[[ "${CREATE_TABLES_ON_STARTUP:-false}" == "false" ]] || error "CREATE_TABLES_ON_STARTUP must be false in production."

command -v docker >/dev/null 2>&1 || error "Docker not found. Install Docker first."
docker compose version >/dev/null 2>&1 || error "Docker Compose v2 not found."
python scripts/check_production_posture.py

info "Preflight OK."

info "Pulling base images..."
compose pull db ntfy clamav || warn "Pull had warnings - continuing."

info "Building API image..."
compose build --no-cache api

info "Starting database..."
compose up -d db
info "Waiting for database to be healthy (up to 60s)..."
for i in $(seq 1 12); do
    if compose exec db pg_isready -U "${POSTGRES_SUPERUSER:-postgres}" -d "${POSTGRES_DB:-edu_connect}" >/dev/null 2>&1; then
        break
    fi
    sleep 5
    [[ $i -eq 12 ]] && error "Database did not become healthy in 60 seconds."
done

info "Running database migrations..."
compose run --rm api alembic upgrade head
info "Migrations complete."

info "Starting all services..."
compose up -d

info "Waiting 10s for API to start..."
sleep 10

HEALTH_URL="https://${FQDN}/health/ready"

info "Checking readiness at ${HEALTH_URL}..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${HEALTH_URL}" || echo "000")

if [[ "$HTTP_STATUS" == "200" ]]; then
    info "Readiness check passed (HTTP 200)."
else
    warn "Readiness check returned HTTP ${HTTP_STATUS}. Check logs: docker compose --env-file .env.production -f docker-compose.yml logs api"
fi

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN} Deployment complete${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  API:       https://${FQDN}"
echo "  Health:    https://${FQDN}/health"
echo "  Readiness: https://${FQDN}/health/ready"
echo "  Logs:      docker compose --env-file .env.production -f docker-compose.yml logs -f api"
echo ""
echo "  Next: Create superadmin account:"
echo "  docker compose --env-file .env.production -f docker-compose.yml exec api python manage.py create-superadmin \\"
echo "    --email admin@${FQDN#api.} --password '<STRONG_PASSWORD>'"
echo ""
