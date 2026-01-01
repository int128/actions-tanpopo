#!/bin/bash
set -eux -o pipefail

if [ ! -f .github/renovate.json ]; then
  echo ".github/renovate.json does not exist. Skipping."
  exit 0
fi

if [ -f renovate.json ]; then
  echo "renovate.json already exists in the repository root. Skipping."
  exit 0
fi

mv .github/renovate.json .

# Format the file
pnpm i
pnpm run check

exit 109 # Skip the coding agent
