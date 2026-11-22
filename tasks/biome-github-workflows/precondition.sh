#!/bin/bash
set -eux -o pipefail

if [ ! -f biome.json ]; then
  exit 99 # skip the task
fi

if grep '.github/workflows' biome.json; then
  exit 99 # skip the task
fi

pnpm i
pnpm biome migrate --write

exit 0 # run the task
