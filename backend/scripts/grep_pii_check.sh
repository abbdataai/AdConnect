#!/usr/bin/env bash
# AT-015 (slice 1) + admin extension (slice 2): fail the build if forbidden
# field identifiers appear in captive-portal source or in admin lead-display
# contexts.
#
# Per-scope policy:
#   - captive-portal source + portal-route backend: phone|email|cpf|last_name|mac_address
#     (portal collects no PII at all — strictest)
#   - admin SPA source: phone|cpf|last_name|mac_address (email is allowed for
#     operator login per the DEMO_ACCOUNTS in backend/main.py; admin must NOT
#     display lead phone/cpf/last_name/raw MAC anywhere)
#
# Comment lines (#, //, *) and *.strings.ts files are whitelisted globally.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STRICT_PATTERN='\b(phone|email|cpf|last_name|mac_address)\b'
ADMIN_PATTERN='\b(phone|cpf|last_name|mac_address)\b'

PORTAL_TARGETS=(
  "$ROOT/backend/portal_routes.py"
  "$ROOT/backend/schemas/portal.py"
  "$ROOT/backend/fixtures/portal_fixtures.py"
)
[[ -d "$ROOT/captive-portal-frontend/src" ]] && PORTAL_TARGETS+=("$ROOT/captive-portal-frontend/src")

scan() {
  local pattern="$1"; shift
  grep -rEn "$pattern" "$@" 2>/dev/null \
    | grep -vE '^[^:]+:[0-9]+:\s*(#|//|\*)' \
    | grep -vE '/strings\.ts:' \
    || true
}

portal_matches="$(scan "$STRICT_PATTERN" "${PORTAL_TARGETS[@]}")"
admin_matches=""
admin_count=0
if [[ -d "$ROOT/mkt-wifi-admin/src" ]]; then
  admin_matches="$(scan "$ADMIN_PATTERN" "$ROOT/mkt-wifi-admin/src")"
  admin_count=1
fi

if [[ -n "$portal_matches" || -n "$admin_matches" ]]; then
  echo "AT-015 FAIL: forbidden field identifiers found:" >&2
  [[ -n "$portal_matches" ]] && echo "$portal_matches" >&2
  [[ -n "$admin_matches" ]] && echo "$admin_matches" >&2
  exit 1
fi

total=$(( ${#PORTAL_TARGETS[@]} + admin_count ))
echo "AT-015 OK: 0 matches across $total target(s) (portal-strict + admin-relaxed-for-auth)"
