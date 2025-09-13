#!/bin/bash
set -eux -o pipefail

if [ -f .node-version ]; then
  exit 99 # skip the task
fi
