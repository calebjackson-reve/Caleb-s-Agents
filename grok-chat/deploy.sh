#!/usr/bin/env bash
# One-command deploy for the calebjackson.org chat Worker.
# Run from anywhere:  bash grok-chat/deploy.sh
# Needs: Node 18+, a free Cloudflare account (the browser login opens once), and your xAI key
# (paste it when asked; it is typed hidden and goes straight to Cloudflare, never to this repo).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/worker"
WR="${WRANGLER:-npx --yes wrangler}"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

say "1/6  Installing"
npm install --no-audit --no-fund >/dev/null

say "2/6  Cloudflare login"
if $WR whoami >/dev/null 2>&1; then
  echo "Already signed in."
else
  $WR login
fi

say "3/6  Storage for rate limits and leads"
ensure_kv() {  # $1 = binding name
  local name="$1" current id out
  current="$(grep -E "binding = \"$name\"" wrangler.toml | grep -oE 'id = "[^"]+"' | cut -d'"' -f2 || true)"
  if [[ -n "$current" && "$current" != REPLACE_WITH_* ]]; then
    echo "$name already set ($current)"; return
  fi
  out="$($WR kv namespace create "$name" </dev/null 2>&1 || true)"
  id="$(printf '%s' "$out" | grep -oE '"id": *"[0-9a-f]{32}"' | head -1 | grep -oE '[0-9a-f]{32}' || true)"
  if [[ -z "$id" ]]; then
    # Namespace may already exist from an earlier run: look it up by title.
    id="$($WR kv namespace list 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((n['id'] for n in d if n['title'].endswith('-$name')), ''))" || true)"
  fi
  [[ -n "$id" ]] || { echo "Could not create or find the $name namespace. Output was:"; echo "$out"; exit 1; }
  python3 - "$name" "$id" <<'PY'
import re, sys
name, nid = sys.argv[1], sys.argv[2]
t = open('wrangler.toml').read()
t = re.sub(r'(binding = "%s",\s*id = ")[^"]*(")' % re.escape(name), r'\g<1>%s\g<2>' % nid, t)
open('wrangler.toml', 'w').write(t)
PY
  echo "$name created ($id)"
}
ensure_kv RATE
ensure_kv LEADS

say "4/6  xAI key"
if $WR secret list 2>/dev/null | grep -q '"XAI_API_KEY"'; then
  echo "XAI_API_KEY already stored in Cloudflare. To replace it run: cd grok-chat/worker && npx wrangler secret put XAI_API_KEY"
else
  echo "Paste your xAI API key (from console.x.ai). Nothing will show as you paste. Press Return."
  $WR secret put XAI_API_KEY
fi

say "5/6  Deploying"
OUT="$($WR deploy 2>&1 | tee /dev/stderr)"
URL="$(printf '%s' "$OUT" | grep -oE 'https://[A-Za-z0-9._-]+\.workers\.dev' | head -1 || true)"
[[ -n "$URL" ]] || { echo "Deployed, but I could not read the URL from the output. Find it in the Cloudflare dashboard under Workers."; exit 1; }

say "6/6  Smoke test against $URL"
echo -n "health:  "; curl -fsS "$URL/health"; echo
echo -n "widget:  "; curl -fsS "$URL/widget.js" | head -c 60 | tr '\n' ' '; echo "..."
echo "chat (one real message to Grok, costs a fraction of a cent):"
curl -fsS -N -X POST "$URL/chat" \
  -H "Origin: https://calebjackson.org" -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"In one sentence, who is Caleb Jackson?"}],"session":"deploy-test"}' \
  | python3 -c "
import sys, json
out = ''
for line in sys.stdin:
    if line.startswith('data:'):
        try: m = json.loads(line[5:])
        except Exception: continue
        out += m.get('delta', '')
        if m.get('error'): print('ERROR:', m['error'], m.get('detail', '')); sys.exit(1)
print('reply:', out.strip() or '(empty reply, check the xAI key and model name)')
"

cat <<MSG

Done. Paste this into Luxury Presence (Settings, Custom Code, footer scripts) and save:

  <script src="$URL/widget.js" defer></script>

Then load calebjackson.org, click "Ask Caleb", and test with a fake lead such as "I'm Test, 225-555-0100".
Read leads any time:  cd grok-chat/worker && npx wrangler kv key list --binding LEADS
MSG
