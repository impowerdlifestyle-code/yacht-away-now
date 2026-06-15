#!/usr/bin/env bash
# Submit URLs to IndexNow (Bing, Yandex, Naver, etc.) for fast recrawl.
# Usage: ./scripts/indexnow.sh [url-path ...]   e.g. ./scripts/indexnow.sh /pricing /our-yacht
# With no args, submits a default set of high-value pages.
set -euo pipefail

HOST="www.yachtawaynow.com"
KEY="b4f8c2e7a1d94f3e8b6c5a2d1e9f7b3c"
KEY_LOCATION="https://${HOST}/${KEY}.txt"

paths=("$@")
if [ ${#paths[@]} -eq 0 ]; then
  paths=(/ /yacht-charter-st-petersburg /our-yacht /pricing
    /egmont-key-boat-charter /shell-key-boat-trip /party-boat-st-petersburg
    /anniversary-cruise-tampa-bay /dolphin-cruise-st-petersburg
    /corporate-yacht-charter /wedding-yacht-charter /bachelorette-party-yacht-charter
    /birthday-yacht-charter /blog/yacht-wedding-vs-venue-cost-comparison /es)
fi

urls=""
for p in "${paths[@]}"; do urls="${urls}\"https://${HOST}${p}\","; done
urls="${urls%,}"
body="{\"host\":\"${HOST}\",\"key\":\"${KEY}\",\"keyLocation\":\"${KEY_LOCATION}\",\"urlList\":[${urls}]}"

echo "Submitting ${#paths[@]} URLs to IndexNow..."
curl -fsS -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "$body" -w "\nHTTP %{http_code}\n"
