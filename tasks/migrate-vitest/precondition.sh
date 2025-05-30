#!/bin/bash
set -eux -o pipefail

if [ -f vitest.config.ts ]; then
  exit 99 # skip the task
fi
