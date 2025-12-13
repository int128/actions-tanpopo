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

perl -i -pne 's/"check": "biome check"/"check": "biome migrate --write \&\& biome check --fix"/' package.json

perl -i -pne 's/run: pnpm run check --fix/run: pnpm run check/' .github/workflows/*.yaml

exit 0
