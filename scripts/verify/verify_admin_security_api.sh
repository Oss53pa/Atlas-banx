#!/usr/bin/env bash
# ============================================================================
# ATLASBANX — Smoke-test COMPORTEMENTAL des contrôles d'accès admin (via API)
# ============================================================================
# Complète verify_admin_security.sql : ce script frappe l'API PostgREST avec de
# VRAIS jetons, donc sous l'identité `authenticator` — le seul contexte où
# is_admin() emprunte réellement le contrôle sur profiles.role. C'est LA preuve
# qu'un non-admin est bien refusé en production.
#
# Prérequis (variables d'environnement) :
#   SUPABASE_URL   ex: https://vgtmljfayiysuvrcmunt.supabase.co   (obligatoire)
#   ANON_KEY       clé anon (publishable)                         (obligatoire)
#   ADMIN_JWT      access_token d'un compte ADMIN                 (optionnel)
#   NONADMIN_JWT   access_token d'un compte NON-admin             (optionnel)
#
# Obtenir un access_token : se connecter dans l'app puis, en console navigateur,
#   (await window.supabase?.auth.getSession())?.data?.session?.access_token
# ou via l'endpoint /auth/v1/token?grant_type=password.
#
# Usage :
#   SUPABASE_URL=... ANON_KEY=... ADMIN_JWT=... NONADMIN_JWT=... \
#     bash scripts/verify/verify_admin_security_api.sh
#
# Sortie : une ligne PASS/FAIL par contrôle ; code de sortie ≠ 0 si un échec.
# ============================================================================
set -uo pipefail

: "${SUPABASE_URL:?SUPABASE_URL requis}"
: "${ANON_KEY:?ANON_KEY requis}"
ADMIN_JWT="${ADMIN_JWT:-}"
NONADMIN_JWT="${NONADMIN_JWT:-}"

REST="${SUPABASE_URL%/}/rest/v1"
FAILURES=0
pass() { printf '  \033[32m✅ PASS\033[0m  %s\n' "$1"; }
fail() { printf '  \033[31m❌ FAIL\033[0m  %s\n' "$1"; FAILURES=$((FAILURES+1)); }
skip() { printf '  \033[33m➖ SKIP\033[0m  %s\n' "$1"; }

# http_code <method> <url> <jwt> [body]
http_code() {
  local method="$1" url="$2" jwt="$3" body="${4:-}"
  curl -s -o /dev/null -w '%{http_code}' -X "$method" "$url" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${jwt:-$ANON_KEY}" \
    -H "Content-Profile: atlasbanx" \
    -H "Accept-Profile: atlasbanx" \
    -H "Content-Type: application/json" \
    ${body:+--data "$body"}
}
# http_body <method> <url> <jwt> [body]
http_body() {
  local method="$1" url="$2" jwt="$3" body="${4:-}"
  curl -s -X "$method" "$url" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${jwt:-$ANON_KEY}" \
    -H "Content-Profile: atlasbanx" \
    -H "Accept-Profile: atlasbanx" \
    -H "Content-Type: application/json" \
    ${body:+--data "$body"}
}

echo "== Atlas Banx — vérification comportementale des accès admin =="
echo

# --- A. anon : INSERT direct dans l'archive → DOIT être refusé ---------------
code=$(http_code POST "${REST}/express_report_archive" "" \
  '{"report_ref":"VERIFY-DIRECT","pdf_sha256":"'"$(printf 'a%.0s' {1..64})"'"}')
if [ "$code" -ge 400 ]; then pass "A. anon INSERT direct archive refusé (HTTP $code)";
else fail "A. anon INSERT direct archive NON refusé (HTTP $code) — attendu 4xx"; fi

# --- B. anon : RPC express_archive_insert → DOIT réussir --------------------
ref="VERIFY-$(date +%s)"
code=$(http_code POST "${REST}/rpc/express_archive_insert" "" \
  '{"p_report_ref":"'"$ref"'","p_pdf_sha256":"'"$(printf 'b%.0s' {1..64})"'","p_bank_code":null,"p_period_start":null,"p_period_end":null,"p_anomaly_count":0,"p_total_recoverable":0,"p_used_official_grid":false}')
if [ "$code" -ge 200 ] && [ "$code" -lt 300 ]; then pass "B. anon RPC archive OK (HTTP $code) [ligne test $ref]";
else fail "B. anon RPC archive échoue (HTTP $code) — attendu 2xx"; fi

# --- C. non-admin : RPC publish_bank_reference_version → DOIT être refusé ----
if [ -n "$NONADMIN_JWT" ]; then
  body=$(http_body POST "${REST}/rpc/publish_bank_reference_version" "$NONADMIN_JWT" \
    '{"p_version_id":"00000000-0000-0000-0000-000000000000"}')
  if printf '%s' "$body" | grep -qi 'administrateur'; then
    pass "C. non-admin publish L2 refusé (message admin)"
  else
    fail "C. non-admin publish L2 NON refusé — réponse: $(printf '%s' "$body" | head -c 160)"
  fi
else skip "C. non-admin publish L2 (NONADMIN_JWT non fourni)"; fi

# --- D. non-admin : RPC admin_reference_journal → DOIT être refusé -----------
if [ -n "$NONADMIN_JWT" ]; then
  body=$(http_body POST "${REST}/rpc/admin_reference_journal" "$NONADMIN_JWT" '{}')
  if printf '%s' "$body" | grep -qi 'administrateur'; then
    pass "D. non-admin journal L2 refusé (message admin)"
  else
    fail "D. non-admin journal L2 NON refusé — réponse: $(printf '%s' "$body" | head -c 160)"
  fi
else skip "D. non-admin journal L2 (NONADMIN_JWT non fourni)"; fi

# --- E. non-admin : lecture des brouillons L2 → DOIT être vide (RLS) --------
if [ -n "$NONADMIN_JWT" ]; then
  body=$(http_body GET "${REST}/bank_reference_versions?select=id&validation_status=eq.draft&limit=5" "$NONADMIN_JWT" "")
  if [ "$body" = "[]" ]; then pass "E. non-admin ne voit aucun brouillon L2 (RLS)";
  else fail "E. non-admin voit des brouillons L2 — réponse: $(printf '%s' "$body" | head -c 160)"; fi
else skip "E. non-admin lecture brouillons L2 (NONADMIN_JWT non fourni)"; fi

# --- F. admin : RPC admin_reference_journal → DOIT réussir -------------------
if [ -n "$ADMIN_JWT" ]; then
  code=$(http_code POST "${REST}/rpc/admin_reference_journal" "$ADMIN_JWT" '{}')
  if [ "$code" -ge 200 ] && [ "$code" -lt 300 ]; then pass "F. admin journal L2 OK (HTTP $code)";
  else fail "F. admin journal L2 échoue (HTTP $code) — attendu 2xx"; fi
else skip "F. admin journal L2 (ADMIN_JWT non fourni)"; fi

echo
if [ "$FAILURES" -eq 0 ]; then
  echo "== Résultat : tous les contrôles exécutés sont au vert =="
  exit 0
else
  echo "== Résultat : ${FAILURES} contrôle(s) en ÉCHEC =="
  exit 1
fi
