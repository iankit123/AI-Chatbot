#!/usr/bin/env bash
# Smoke-test production API from DigitalOcean (or any host with curl).
#
# Usage:
#   BASE_URL=https://your-domain.com ./scripts/test-production-api.sh
#
# Optional env:
#   COMPANION_ID=parenting          # companion slug
#   ANON_ID=my-stable-guest-id      # defaults to do-test-<epoch>
#   SKIP_LLM=1                      # skip POST /api/messages (OpenRouter round-trip)

set -u

BASE_URL="${BASE_URL:-https://meribaat.vercel.app}"
BASE_URL="${BASE_URL%/}"
COMPANION_ID="${COMPANION_ID:-parenting}"
ANON_ID="${ANON_ID:-do-test-$(date +%s)}"
SKIP_LLM="${SKIP_LLM:-0}"

say() { printf '\n=== %s ===\n' "$*"; }

pretty() {
  if command -v jq >/dev/null 2>&1; then
    jq . 2>/dev/null || cat
  else
    cat
  fi
}

curl_json() {
  local url="$1"
  shift
  local code body tmp
  tmp="$(mktemp)"
  code="$(curl -sS -o "$tmp" -w '%{http_code}' "$url" "$@")"
  body="$(cat "$tmp")"
  rm -f "$tmp"
  printf '%s\n' "$body" | pretty
  printf 'HTTP %s\n' "$code"
  if [[ "$code" =~ ^2 ]]; then return 0; fi
  return 1
}

curl_json_post() {
  local url="$1"
  local data="$2"
  local code body tmp
  tmp="$(mktemp)"
  code="$(curl -sS -o "$tmp" -w '%{http_code}' -X POST "$url" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -d "$data")"
  body="$(cat "$tmp")"
  rm -f "$tmp"
  printf '%s\n' "$body" | pretty
  printf 'HTTP %s\n' "$code"
  if [[ "$code" =~ ^2 ]]; then return 0; fi
  return 1
}

failures=0

say "Config"
echo "BASE_URL=$BASE_URL"
echo "COMPANION_ID=$COMPANION_ID"
echo "ANON_ID=$ANON_ID"

say "0) GET /api/ping (no Express — confirms routing)"
curl_json "${BASE_URL}/api/ping" || failures=$((failures + 1))

say "1) GET /api/chat/messages (empty or existing history)"
if ! curl_json "${BASE_URL}/api/chat/messages?companionId=${COMPANION_ID}&anonymousUserId=${ANON_ID}"; then
  echo "(non-2xx — check Supabase env + migrations on the server)" >&2
  failures=$((failures + 1))
fi

say "2) POST /api/chat/messages (persist assistant line)"
PAYLOAD_ASSIST=$(
  printf '%s' "$(jq -n \
    --arg cid "$COMPANION_ID" \
    --arg aid "$ANON_ID" \
    '{anonymousUserId:$aid, companionId:$cid, role:"assistant", content:"Hi — DO smoke test", language:"hindi"}')" 2>/dev/null
)
if [[ -z "$PAYLOAD_ASSIST" ]]; then
  # jq optional fallback (no jq / minimal shell)
  PAYLOAD_ASSIST="$(printf '{"anonymousUserId":"%s","companionId":"%s","role":"assistant","content":"Hi — DO smoke test","language":"hindi"}' "$ANON_ID" "$COMPANION_ID")"
fi

if ! curl_json_post "${BASE_URL}/api/chat/messages" "$PAYLOAD_ASSIST"; then
  echo "(non-2xx — persistence failed)" >&2
  failures=$((failures + 1))
fi

say "3) POST /api/chat/messages (persist user line)"
PAYLOAD_USER=$(
  printf '%s' "$(jq -n \
    --arg cid "$COMPANION_ID" \
    --arg aid "$ANON_ID" \
    '{anonymousUserId:$aid, companionId:$cid, role:"user", content:"Baby ka weight gain slow hai — quick tip?", language:"hindi"}')" 2>/dev/null
)
if [[ -z "$PAYLOAD_USER" ]]; then
  PAYLOAD_USER="$(printf '{"anonymousUserId":"%s","companionId":"%s","role":"user","content":"Baby ka weight gain slow hai — quick tip?","language":"hindi"}' "$ANON_ID" "$COMPANION_ID")"
fi

if ! curl_json_post "${BASE_URL}/api/chat/messages" "$PAYLOAD_USER"; then
  failures=$((failures + 1))
fi

say "4) GET /api/chat/messages again (should list persisted rows)"
if ! curl_json "${BASE_URL}/api/chat/messages?companionId=${COMPANION_ID}&anonymousUserId=${ANON_ID}"; then
  failures=$((failures + 1))
fi

say "5) GET /api/chat/conversations"
if ! curl_json "${BASE_URL}/api/chat/conversations?anonymousUserId=${ANON_ID}"; then
  failures=$((failures + 1))
fi

if [[ "$SKIP_LLM" == "1" ]]; then
  say "6) POST /api/messages (skipped — SKIP_LLM=1)"
else
  say "6) POST /api/messages (LLM — needs OPENROUTER_API_KEY on server; may take several seconds)"
  PAYLOAD_LLM=$(
    printf '%s' "$(jq -n \
      --arg cid "$COMPANION_ID" \
      '{content:"One short parenting tip in Hinglish.", language:"hindi", companionId:$cid, conversationHistory:[{role:"assistant",content:"Hi"},{role:"user",content:"Baby sulane ki routine?"}], messageCount:2, isAuthenticated:false}' \
      )" 2>/dev/null
  )
  if [[ -z "$PAYLOAD_LLM" ]]; then
    PAYLOAD_LLM='{"content":"One short parenting tip in Hinglish.","language":"hindi","companionId":"'"$COMPANION_ID"'","conversationHistory":[{"role":"assistant","content":"Hi"},{"role":"user","content":"Baby sulane ki routine?"}],"messageCount":2,"isAuthenticated":false}'
  fi
  if ! curl_json_post "${BASE_URL}/api/messages" "$PAYLOAD_LLM"; then
    echo "(non-2xx — often OPENROUTER_API_KEY missing or model error)" >&2
    failures=$((failures + 1))
  fi
fi

say "Done"
if [[ "$failures" -gt 0 ]]; then
  echo "Failures: $failures (see HTTP lines above)" >&2
  exit 1
fi
echo "All requested steps returned 2xx."
