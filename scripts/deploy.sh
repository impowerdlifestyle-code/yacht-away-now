#!/usr/bin/env bash
# yacht-away-now deploy: push to GitHub main → Vercel auto-deploys → PATCH Airtable.
#
# Called by the dispatch agent in site-portal/api/decide as:
#   ./scripts/deploy.sh "<worktreePath>" "<recordId>"
#
# Cwd at invocation = worktree. Required env (set by /api/decide):
#   BB_REPO_PATH         — primary repo root
#   BB_BRANCH            — throwaway branch the agent committed to
#   BB_AIRTABLE_BASE_ID  — destination Airtable base for the PATCH
#   AIRTABLE_PAT         — bearer token for Airtable

set -euo pipefail

WORKTREE_PATH="${1:?worktreePath required}"
RECORD_ID="${2:?recordId required}"
: "${BB_REPO_PATH:?BB_REPO_PATH not set}"
: "${BB_BRANCH:?BB_BRANCH not set}"
: "${BB_AIRTABLE_BASE_ID:?BB_AIRTABLE_BASE_ID not set}"
: "${AIRTABLE_PAT:?AIRTABLE_PAT not set}"

# yacht-away-now's stable production alias. Hardcoded because the Vercel
# deploy is async via GitHub push — we don't have a deploy command that
# returns the URL synchronously.
LIVE_URL="https://www.yachtawaynow.com"

LOG_DIR="$BB_REPO_PATH/.site-portal-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/${RECORD_ID}.log"

PATCH_AIRTABLE() {
  local fields_json="$1"
  curl -fsS -X PATCH \
    "https://api.airtable.com/v0/${BB_AIRTABLE_BASE_ID}/Requests/${RECORD_ID}" \
    -H "Authorization: Bearer ${AIRTABLE_PAT}" \
    -H "Content-Type: application/json" \
    --data "{\"fields\":${fields_json}}" \
    >/dev/null
}

JSON_ESCAPE() {
  python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))'
}

trap 'on_err' ERR
on_err() {
  local tail
  tail="$(tail -c 4000 "$LOG_FILE" 2>/dev/null || true)"
  local escaped
  escaped="$(printf "%s" "$tail" | JSON_ESCAPE)"
  PATCH_AIRTABLE "{\"Status\":\"In Progress\",\"Rejection Reason\":${escaped}}" || true
  # Leave worktree + branch in place on failure for the operator to inspect.
  exit 1
}

cd "$BB_REPO_PATH"
DEFAULT_BRANCH="$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||' || echo main)"
git checkout "$DEFAULT_BRANCH" 2>&1 | tee -a "$LOG_FILE"
git merge --ff-only "$BB_BRANCH" 2>&1 | tee -a "$LOG_FILE"
git push origin "$DEFAULT_BRANCH" 2>&1 | tee -a "$LOG_FILE"
git worktree remove --force "$WORKTREE_PATH" 2>&1 | tee -a "$LOG_FILE"
git branch -d "$BB_BRANCH" 2>&1 | tee -a "$LOG_FILE" || true

ESCAPED_URL="$(printf "%s" "$LIVE_URL" | JSON_ESCAPE)"
PATCH_AIRTABLE "{\"Status\":\"Done\",\"Deploy URL\":${ESCAPED_URL}}"

echo "deployed: $LIVE_URL (Vercel propagates within ~60s of the push)" | tee -a "$LOG_FILE"
