#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
compose() { docker compose --env-file .env.production -f docker-compose.yml "$@"; }

info "Running VPS preflight checks..."

[[ -f ".env.production" ]] || error ".env.production not found. Generate and review it first."
[[ -f "secrets/private_key.pem" ]] || error "secrets/private_key.pem is missing."
[[ -f "secrets/public_key.pem" ]] || error "secrets/public_key.pem is missing."

set -a
source .env.production
set +a

if grep -Eq "REPLACE_WITH|YOUR_|change-this" .env.production; then
    error ".env.production still contains placeholder values."
fi

for name in APP_ENV FQDN WEB_FQDN WEB_API_BASE_URL CORS_ORIGINS REDIS_PASSWORD \
    BACKUP_AGE_RECIPIENT BACKUP_REMOTE_HOST BACKUP_REMOTE_PATH; do
    [[ -n "${!name:-}" ]] || error "$name is required."
done

[[ "$APP_ENV" == "production" ]] || error "APP_ENV must be production."
[[ "${CREATE_TABLES_ON_STARTUP:-false}" == "false" ]] || error "CREATE_TABLES_ON_STARTUP must be false."
[[ "$FQDN" != "$WEB_FQDN" ]] || error "FQDN and WEB_FQDN must be different hostnames."
[[ "$WEB_API_BASE_URL" == "https://${FQDN}" ]] || error "WEB_API_BASE_URL must equal https://${FQDN}."
[[ "$CORS_ORIGINS" == *"https://${WEB_FQDN}"* ]] || error "CORS_ORIGINS must include https://${WEB_FQDN}."
[[ "$BACKUP_AGE_RECIPIENT" == age1* ]] || error "BACKUP_AGE_RECIPIENT must be a valid age public recipient."

command -v docker >/dev/null 2>&1 || error "Docker is not installed."
docker compose version >/dev/null 2>&1 || error "Docker Compose v2 is not installed."
command -v curl >/dev/null 2>&1 || error "curl is not installed."
command -v age >/dev/null 2>&1 || error "age is not installed."
command -v rsync >/dev/null 2>&1 || error "rsync is not installed."
getent ahosts "$FQDN" >/dev/null 2>&1 || error "DNS does not resolve for $FQDN."
getent ahosts "$WEB_FQDN" >/dev/null 2>&1 || error "DNS does not resolve for $WEB_FQDN."

python scripts/check_production_posture.py --actual-env .env.production
compose config --quiet

info "Pulling production images..."
compose pull caddy db redis clamav

info "Building API and web images..."
compose build --pull api web

info "Validating Caddy configuration..."
compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

info "Starting private dependencies..."
compose up -d --wait --wait-timeout 240 db redis clamav

info "Applying database migrations..."
compose run --rm --no-deps api alembic upgrade head

info "Starting the complete stack..."
compose up -d --wait --wait-timeout 240

API_HEALTH_URL="https://${FQDN}/health/ready"
WEB_HEALTH_URL="https://${WEB_FQDN}/login"

info "Checking API readiness at ${API_HEALTH_URL}..."
curl --fail --silent --show-error --max-time 20 "$API_HEALTH_URL" >/dev/null \
    || error "API readiness failed. Run: docker compose --env-file .env.production logs api"

info "Checking web application at ${WEB_HEALTH_URL}..."
curl --fail --silent --show-error --max-time 20 "$WEB_HEALTH_URL" >/dev/null \
    || error "Web readiness failed. Run: docker compose --env-file .env.production logs web caddy"

echo ""
echo -e "${GREEN}Deployment complete${NC}"
echo "  Web:       https://${WEB_FQDN}"
echo "  API:       https://${FQDN}"
echo "  Readiness: ${API_HEALTH_URL}"
echo ""
echo "Create the first platform administrator with an interactive password prompt:"
echo '  docker compose --env-file .env.production exec api python manage.py create-superadmin \'
echo "    --email admin@${WEB_FQDN#app.} --full-name 'Platform Administrator'"
echo ""
echo "Then verify everything: ./scripts/verify_deployment.sh"
