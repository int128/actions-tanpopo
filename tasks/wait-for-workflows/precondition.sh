#!/bin/bash
set -eux -o pipefail

if [[ ! -d .github/workflows ]]; then
  exit 99 # Skip the task
fi

if [[ -f .github/workflows/wait-for-workflows.yaml ]]; then
  exit 99 # Skip the task
fi

cp /home/runner/work/actions-tanpopo/actions-tanpopo/.github/workflows/wait-for-workflows.yaml .github/workflows/wait-for-workflows.yaml

if git diff --quiet; then
  exit 99 # Skip the task
fi

exit 0
