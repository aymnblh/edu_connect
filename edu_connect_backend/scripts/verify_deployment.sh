#!/usr/bin/env bash
# ============================================================================
# EduConnect — Post-deployment health verification
#
# Run after deploy.sh to confirm all services are responding correctly.
# Usage: FQDN=api.educonnect.dz ./scripts/verify_deployment.sh
# ============================================================================
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
PASS=0; FAIL=0

if [[ -f ".env.production" ]]; then
    set -a
    source .env.production
    set +a
fi

check() {
    local name="$1"; local cmd="$2"; local expected="$3"
    local result
    result=$(eval "$cmd" 2>/dev/null || echo "ERROR")
    if echo "$result" | grep -q "$expected"; then
        echo -e "  ${GREEN}[PASS]${NC} $name"
        ((PASS++))
    else
        echo -e "  ${RED}[FAIL]${NC} $name (got: $result)"
        ((FAIL++))
    fi
}

FQDN="${FQDN:-$(grep '^FQDN=' .env.production 2>/dev/null | cut -d'=' -f2)}"
[[ -z "$FQDN" ]] && { echo "Set FQDN env var or have .env.production present"; exit 1; }

echo ""
echo "EduConnect Production Verification"
echo "==================================="
echo "  Target: https://${FQDN}"
echo ""

# ── Backend checks ────────────────────────────────────────────────────────────
echo "Backend:"
check "Health endpoint (HTTP 200)" \
    "curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://${FQDN}/health" "200"
check "Health response (status ok)" \
    "curl -s --max-time 10 https://${FQDN}/health" '"status"'
check "Readiness endpoint (HTTP 200)" \
    "curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://${FQDN}/health/ready" "200"
check "HTTPS redirect (HTTP 301)" \
    "curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://${FQDN}/health" "301"
check "SSL certificate valid" \
    "echo | openssl s_client -connect ${FQDN}:443 -servername ${FQDN} 2>/dev/null | openssl x509 -noout -checkend 0" "0"
check "Migration head applied" \
    "current=\$(docker compose exec api alembic current 2>/dev/null | awk '{print \$1}'); head=\$(docker compose exec api alembic heads 2>/dev/null | awk '{print \$1}'); test \"\$current\" = \"\$head\" && echo ok" "ok"

# ── Database checks ───────────────────────────────────────────────────────────
echo ""
echo "Database:"
check "PostgreSQL healthy" \
    "docker compose exec db pg_isready -U \${POSTGRES_SUPERUSER:-postgres} -d \${POSTGRES_DB:-edu_connect} 2>/dev/null" "accepting"

# ── Redis checks ──────────────────────────────────────────────────────────────
# Only if Redis is in the compose stack
echo ""
echo "Services:"
check "API container running" \
    "docker compose ps api --format json | python3 -c \"import sys,json; d=json.load(sys.stdin); print(d.get('State',''))\" 2>/dev/null" "running"
check "DB container running" \
    "docker compose ps db --format json | python3 -c \"import sys,json; d=json.load(sys.stdin); print(d.get('State',''))\" 2>/dev/null" "running"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "==================================="
echo -e "  ${GREEN}PASSED${NC}: $PASS  ${RED}FAILED${NC}: $FAIL"
echo ""
if [[ $FAIL -eq 0 ]]; then
    echo -e "  ${GREEN}All checks passed — production is healthy.${NC}"
else
    echo -e "  ${RED}$FAIL check(s) failed. Review above and fix before going live.${NC}"
    exit 1
fi
