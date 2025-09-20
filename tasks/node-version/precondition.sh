#!/bin/bash
set -eux -o pipefail

if grep 'node-version:' .github/workflows/*; then
  exit 0 # run the task
fi

exit 99 # skip the task
