#!/bin/bash
set -eux -o pipefail

taskdir="$(dirname "$0")"

if [ -d src/generated ]; then
  cp "$taskdir/biome-with-generated.json" biome.json
else
  cp "$taskdir/biome-standard.json" biome.json
fi

rm -f .prettierignore .prettierrc.json prettier.config.js eslint.config.js

pnpm add -D -E @biomejs/biome
pnpm remove @eslint/js eslint prettier typescript-eslint @vitest/eslint-plugin || true

pnpm biome migrate --write
pnpm biome check --write --unsafe

if grep -q 'biome check' package.json; then
  exit 0 # run the task
fi
if grep -q 'pnpm run check' .github/workflows/*; then
  exit 0 # run the task
fi

if [ -z "$(git status --porcelain)" ]; then
  exit 99 # skip the task
fi

exit 0 # run the task
