#!/bin/bash
set -eux -o pipefail

if [ -f ".github/renovate.json" ]; then
  echo "renovate.json already exists. Skipping migration."
  exit 99
fi

if [ ! -f ".github/renovate.json5" ]; then
  echo "renovate.json5 does not exist. Nothing to migrate."
  exit 99
fi

exit 0
