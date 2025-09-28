#!/bin/bash
set -eux -o pipefail

if grep -v 'uses: actions/setup-node' .github/workflows/*; then
  exit 99 # Skip the task
fi

if grep 'package-manager-cache: false' .github/workflows/*; then
  exit 99 # Skip the task
fi
