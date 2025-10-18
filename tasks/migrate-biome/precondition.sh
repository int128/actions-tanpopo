#!/bin/bash
set -eux -o pipefail

taskdir="$(dirname "$0")"

if [ -d src/generated ]; then
  cp "$taskdir/biome-with-generated.json" biome.json
else
  cp "$taskdir/biome.json" biome.json
fi

rm -f .prettierignore .prettierrc.json prettier.config.js eslint.config.js

pnpm add -D -E @biomejs/biome
pnpm remove @eslint/js eslint prettier typescript-eslint @vitest/eslint-plugin || true

pnpm biome migrate --write
pnpm run check --fix

if [ -z "$(git status --porcelain)" ]; then
  exit 99 # skip the task
fi

exit 0 # run the task
