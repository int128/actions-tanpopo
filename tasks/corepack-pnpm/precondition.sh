#!/bin/bash
set -eux -o pipefail

if [[ ! -d .github/workflows ]]; then
  exit 99 # Skip the task
fi

if ! grep 'npm install -g corepack' .github/workflows/*; then
  exit 99 # Skip the task
fi

sed -i '' -E 's/( *)- run: npm install -g pnpm@latest-10$/\1- run: npm install -g corepack\n\1- run: corepack enable/g' .github/workflows/*

sed -i '' -E '/package-manager-cache: false/d' .github/workflows/*

exit 109 # Skip the coding agent
