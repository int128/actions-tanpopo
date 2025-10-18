#!/bin/bash
set -eux -o pipefail

if [[ -f biome.json ]]; then
  exit 99 # skip the task
fi

exit 0 # run the task
