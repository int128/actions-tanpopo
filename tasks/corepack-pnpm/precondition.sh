#!/bin/bash
set -eux -o pipefail

if [[ ! -d .github/workflows ]]; then
  exit 99 # Skip the task
fi

if grep 'corepack enable' .github/workflows/*; then
  exit 99 # Skip the task
fi
