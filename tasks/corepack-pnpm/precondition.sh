#!/bin/bash
set -eux -o pipefail

if [[ ! -d .github/workflows ]]; then
  exit 99 # Skip the task
fi

if ! grep 'npm install -g pnpm@' .github/workflows/*; then
  exit 99 # Skip the task
fi

# Replace pnpm installation with corepack enable
perl -i -pe 's/( *)- run: npm install -g pnpm@.+/\1- run: npm install -g corepack\n\1- run: corepack enable/g' .github/workflows/*

# Remove "package-manager-cache: false" if it exists
perl -i -pe 's/ +package-manager-cache: false\n//g' .github/workflows/*

exit 109 # Skip the coding agent
