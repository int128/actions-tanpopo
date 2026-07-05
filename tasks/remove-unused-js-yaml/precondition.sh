#!/bin/bash
set -eux -o pipefail

if [[ ! -f package.json ]]; then
  exit 99 # Skip the task
fi

if ! grep 'js-yaml' package.json; then
  exit 99 # Skip the task
fi
