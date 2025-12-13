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

exit 0
