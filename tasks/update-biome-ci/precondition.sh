#!/bin/bash
set -eux -o pipefail

if [[ ! -d .github/workflows ]]; then
  exit 99 # Skip the task
fi

if ! grep '@biomejs/biome' package.json; then
  exit 99 # Skip the task
fi

if grep 'biome migrate --write' package.json; then
  exit 99 # Skip the task
fi

jq '.scripts.check = "biome migrate --write && biome check --fix"' package.json > package.tmp.json
mv package.tmp.json package.json

perl -i -pne 's/run: pnpm biome check --fix/run: pnpm run check/' .github/workflows/*.yaml

pnpm run check

if git diff --quiet; then
  exit 99 # Skip the task
fi

exit 0
