#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# The public reference predates the state-helper API. Check pure logic against
# it; validate + native plugin tests check registration on the pinned engine.
reference_commit=3deb873687379f0c199a69fdaccc65f0865f7a29
reference_dir=node_modules/.cache/claudemod-types
mkdir -p "$reference_dir"
if [[ ! -f "$reference_dir/claude-code.d.ts" ]]; then
  curl --fail --silent --show-error --location --max-time 60 \
    "https://raw.githubusercontent.com/anthropics/claude-code/$reference_commit/mods/types/claude-code.d.ts" \
    --output "$reference_dir/claude-code.d.ts.tmp"
  mv "$reference_dir/claude-code.d.ts.tmp" "$reference_dir/claude-code.d.ts"
fi
node_modules/.bin/tsc -p tsconfig.logic.json
