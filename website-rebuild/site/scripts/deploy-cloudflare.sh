#!/usr/bin/env bash
# Direct-upload deploy of the launch bundle to Cloudflare Pages. No Git integration needed.
# Needs: CLOUDFLARE_API_TOKEN (Pages: Edit, Account Settings: Read), CLOUDFLARE_ACCOUNT_ID,
# and LEAD_WEBHOOK (the Apps Script web app URL). Run from the repo root or website-rebuild.
set -euo pipefail
cd "$(dirname "$0")/../.."                      # website-rebuild/
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}" "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID}"
PROJECT="${PAGES_PROJECT:-calebjackson}"
API="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects"
H=(-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json")

python3 site/scripts/build.py >/dev/null
python3 site/scripts/dist.py dist >/dev/null
echo "bundle built"

# 1. project (create once)
if ! curl -sf "${H[@]}" "$API/$PROJECT" >/dev/null; then
  curl -sf "${H[@]}" -X POST "$API" -d "{\"name\":\"$PROJECT\",\"production_branch\":\"main\"}" >/dev/null && echo "project created: $PROJECT"
fi
# 2. env var for the lead function
if [ -n "${LEAD_WEBHOOK:-}" ]; then
  curl -sf "${H[@]}" -X PATCH "$API/$PROJECT" -d "{\"deployment_configs\":{\"production\":{\"env_vars\":{\"LEAD_WEBHOOK\":{\"value\":\"$LEAD_WEBHOOK\"}}}}}" >/dev/null && echo "LEAD_WEBHOOK set"
fi
# 3. upload: wrangler picks up functions/ next to the output dir
npx --yes wrangler@3 pages deploy dist --project-name "$PROJECT" --branch main --commit-dirty=true
# 4. no custom domains. calebjackson.org stays on Luxury Presence (Caleb, 2026-10-19).
# This project lives at pages.dev only. Don't attach calebjackson.org or www here.
echo "done. preview: https://$PROJECT.pages.dev"
