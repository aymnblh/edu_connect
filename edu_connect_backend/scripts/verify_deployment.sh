#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'
PASS=0
FAIL=0

[[ -f ".env.production" ]] || {
  echo "Missing .env.production" >&2
  exit 1
}

set -a
source .env.production
set +a

: "${FQDN:?FQDN is required}"
: "${WEB_FQDN:?WEB_FQDN is required}"

compose() { docker compose --env-file .env.production -f docker-compose.yml "$@"; }

pass() {
  echo -e "  ${GREEN}[PASS]${NC} $1"
  PASS=$((PASS + 1))
}

fail() {
  echo -e "  ${RED}[FAIL]${NC} $1${2:+ ($2)}"
  FAIL=$((FAIL + 1))
}

expect_equal() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    pass "$name"
  else
    fail "$name" "expected ${expected}, got ${actual:-empty}"
  fi
}

http_status() {
  curl --silent --output /dev/null --write-out '%{http_code}' --max-time 20 "$1" || true
}

echo ""
echo "EduConnect VPS Production Verification"
echo "======================================"
echo "  Web: https://${WEB_FQDN}"
echo "  API: https://${FQDN}"
echo ""

expect_equal "API health endpoint" "200" "$(http_status "https://${FQDN}/health")"
expect_equal "API readiness endpoint" "200" "$(http_status "https://${FQDN}/health/ready")"
expect_equal "Web login page" "200" "$(http_status "https://${WEB_FQDN}/login")"
expect_equal "API HTTP to HTTPS redirect" "308" "$(http_status "http://${FQDN}/health")"
expect_equal "Web HTTP to HTTPS redirect" "308" "$(http_status "http://${WEB_FQDN}/login")"

if echo | openssl s_client -connect "${FQDN}:443" -servername "$FQDN" 2>/dev/null \
  | openssl x509 -noout -checkend 0 >/dev/null 2>&1; then
  pass "API TLS certificate is valid"
else
  fail "API TLS certificate is valid"
fi

if echo | openssl s_client -connect "${WEB_FQDN}:443" -servername "$WEB_FQDN" 2>/dev/null \
  | openssl x509 -noout -checkend 0 >/dev/null 2>&1; then
  pass "Web TLS certificate is valid"
else
  fail "Web TLS certificate is valid"
fi

cors_headers="$(
  curl --silent --show-error --dump-header - --output /dev/null --max-time 20 \
    -X OPTIONS \
    -H "Origin: https://${WEB_FQDN}" \
    -H "Access-Control-Request-Method: GET" \
    "https://${FQDN}/health" | tr -d '\r' || true
)"
if grep -Fqi "access-control-allow-origin: https://${WEB_FQDN}" <<<"$cors_headers"; then
  pass "CORS allows only the deployed web origin"
else
  fail "CORS allows the deployed web origin"
fi

web_headers="$(curl --silent --show-error --head --max-time 20 "https://${WEB_FQDN}/login" | tr -d '\r' || true)"
if grep -Fqi "strict-transport-security:" <<<"$web_headers" \
  && grep -Fqi "content-security-policy:" <<<"$web_headers"; then
  pass "Web security headers are present"
else
  fail "Web security headers are present"
fi

current_revision="$(compose exec -T api alembic current 2>/dev/null | awk 'NR==1 {print $1}')"
head_revision="$(compose exec -T api alembic heads 2>/dev/null | awk 'NR==1 {print $1}')"
expect_equal "Alembic migration head is applied" "$head_revision" "$current_revision"

db_status="$(compose exec -T db pg_isready -U "${POSTGRES_SUPERUSER:-postgres}" -d "${POSTGRES_DB:-edu_connect}" 2>/dev/null || true)"
if grep -Fq "accepting connections" <<<"$db_status"; then
  pass "PostgreSQL is healthy"
else
  fail "PostgreSQL is healthy" "$db_status"
fi

expect_equal "Redis is healthy" "PONG" "$(compose exec -T redis redis-cli ping 2>/dev/null || true)"

running_services="$(compose ps --status running --services)"
for service in caddy db redis clamav api web; do
  if grep -Fxq "$service" <<<"$running_services"; then
    pass "Container ${service} is running"
  else
    fail "Container ${service} is running"
  fi
done

if [[ -z "$(compose port db 5432 2>/dev/null || true)" ]] \
  && [[ -z "$(compose port redis 6379 2>/dev/null || true)" ]] \
  && [[ -z "$(compose port clamav 3310 2>/dev/null || true)" ]]; then
  pass "Database, Redis, and ClamAV have no public host ports"
else
  fail "Private data services have no public host ports"
fi

echo ""
echo "======================================"
echo -e "  ${GREEN}PASSED${NC}: $PASS  ${RED}FAILED${NC}: $FAIL"
echo ""

if [[ $FAIL -ne 0 ]]; then
  exit 1
fi

echo -e "${GREEN}All VPS production checks passed.${NC}"
