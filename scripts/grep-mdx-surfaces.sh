#!/usr/bin/env bash
# Per spec §10.1 + §11 Risk 8: enumerate MDX surfaces.
set -euo pipefail
echo "MDX files under src/:"
find src/ -name '*.mdx' || true
echo "---"
echo "MDX imports under src/:"
grep -rE "from ['\"][^'\"]+\.mdx['\"]" src/ || echo "(none)"
