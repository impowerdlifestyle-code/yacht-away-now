#!/usr/bin/env bash
# Stamp /style.css and /app.js references with a content hash so the 30-day
# Cache-Control in vercel.json never serves a stale file to returning visitors.
# Run after editing style.css or app.js, before committing.
set -euo pipefail
cd "$(dirname "$0")/.."
for asset in style.css app.js; do
  [ -f "$asset" ] || continue
  h=$(shasum "$asset" | cut -c1-8)
  perl -0pi -e "s#/${asset}(\?v=[0-9a-f]+)?\"#/${asset}?v=${h}\"#g" *.html es/*.html blog/*.html
  echo "$asset -> ?v=$h"
done
