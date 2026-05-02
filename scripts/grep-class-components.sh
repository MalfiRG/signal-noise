#!/usr/bin/env bash
# Per spec §10.1 + §11 Risk 3: verify functional-component-only assumption.
set -euo pipefail
hits=$(grep -rE "^[^/]*class\s+\w+\s+extends\s+(React\.)?(Pure)?Component" src/ || true)
if [ -n "$hits" ]; then
  echo "FAIL: class components found:" >&2
  echo "$hits" >&2
  exit 1
fi
echo "PASS: zero class-component matches"
