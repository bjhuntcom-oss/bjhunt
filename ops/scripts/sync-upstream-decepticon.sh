#!/usr/bin/env bash
# sync-upstream-decepticon.sh — Monthly merge of PurpleAILAB/Decepticon upstream.
#
# Per docs/architecture/04-DECEPTICON-ENGINE.md and the master roadmap §P7.
#
# Strategy:
#   - Treat `engine/decepticon/` as vendored from a separate repo.
#   - Pull `upstream/main` into a worktree, copy the `decepticon/` directory
#     into our `engine/decepticon/`, run upstream tests, tag the merge.
#   - NEVER edit upstream files. All BJHUNT changes live in `engine/bjhunt_engine/`.
#
# Run manually monthly. NOT a cron job (needs human review of the diff).
#
# Usage:
#   bash ops/scripts/sync-upstream-decepticon.sh
#
# Exits non-zero on test failure or merge conflict.

set -euo pipefail

UPSTREAM_REPO="https://github.com/PurpleAILAB/Decepticon.git"
WORKTREE_DIR="/tmp/bjhunt-upstream-decepticon-$(date -u +%s)"
REPO_ROOT="$(git rev-parse --show-toplevel)"
DECEPTICON_DIR="$REPO_ROOT/engine/decepticon"

cd "$REPO_ROOT"

echo "=== Phase 1 — Pre-merge baseline ==="
if ! git diff --quiet engine/decepticon/; then
    echo "ERROR: Uncommitted changes in engine/decepticon/. Commit or stash first."
    exit 1
fi

PRE_TAG="pre-upstream-merge-$(date -u +%Y%m%d-%H%M%S)"
git tag "$PRE_TAG"
echo "Tagged current state: $PRE_TAG (rollback target)"

echo ""
echo "=== Phase 2 — Clone upstream ==="
git clone --depth 1 --branch main "$UPSTREAM_REPO" "$WORKTREE_DIR"
UPSTREAM_SHA=$(git -C "$WORKTREE_DIR" rev-parse --short HEAD)
UPSTREAM_TAG=$(git -C "$WORKTREE_DIR" describe --tags --abbrev=0 2>/dev/null || echo "no-tag")
echo "Upstream HEAD: $UPSTREAM_SHA ($UPSTREAM_TAG)"

echo ""
echo "=== Phase 3 — Copy decepticon/ tree (rsync, deletion of removed files) ==="
rsync -av --delete \
    --exclude '__pycache__' --exclude '*.pyc' \
    "$WORKTREE_DIR/decepticon/" "$DECEPTICON_DIR/"

echo ""
echo "=== Phase 4 — Detect changes ==="
CHANGED=$(git diff --shortstat engine/decepticon/ || true)
echo "Diff: $CHANGED"

if [[ -z "$CHANGED" ]]; then
    echo "No changes — upstream did not progress. Cleaning up."
    rm -rf "$WORKTREE_DIR"
    git tag -d "$PRE_TAG" >/dev/null
    exit 0
fi

echo ""
echo "=== Phase 5 — Tests ==="
echo "Running engine tests against new upstream..."
cd engine
if uv sync --frozen 2>/dev/null && uv run pytest decepticon/tests/ -q 2>&1; then
    echo "Tests PASSED"
else
    echo "ERROR: Tests FAILED on new upstream — rolling back"
    cd "$REPO_ROOT"
    git checkout "$PRE_TAG" -- engine/decepticon/
    rm -rf "$WORKTREE_DIR"
    exit 1
fi
cd "$REPO_ROOT"

echo ""
echo "=== Phase 6 — Tag merged state ==="
MERGED_TAG="upstream-${UPSTREAM_TAG}-merged-$(date -u +%Y%m%d)"
git add engine/decepticon/
git commit -m "chore(engine): sync upstream Decepticon to ${UPSTREAM_TAG} (${UPSTREAM_SHA})

Pulled from $UPSTREAM_REPO at ${UPSTREAM_SHA}.
Upstream tests passed locally before commit.

Refs: docs/architecture/04-DECEPTICON-ENGINE.md §P7 upstream merge cadence.
Rollback: git reset --hard ${PRE_TAG}"
git tag "$MERGED_TAG"

echo ""
echo "=== DONE ==="
echo "  pre-merge tag : $PRE_TAG"
echo "  merged tag    : $MERGED_TAG"
echo "  upstream sha  : $UPSTREAM_SHA"
echo ""
echo "Next steps:"
echo "  1. Smoke chat E2E: docker compose up -d && open https://chat.bjhunt.com"
echo "  2. If OK: git push origin main && git push origin $MERGED_TAG"
echo "  3. If KO: git reset --hard $PRE_TAG && investigate before retry"

rm -rf "$WORKTREE_DIR"
