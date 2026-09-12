#!/bin/bash
set -eux -o pipefail

if [[ ! -f pnpm-lock.yaml ]]; then
  exit 99 # Skip the task
fi

jq '.packageManager = "pnpm@12.3.4" | .devDependencies.pnpm = "12.3.4"' package.json > package.json.new
mv package.json.new package.json

pnpm i || true

pnpm approve-builds '!pnpm'

pnpm i

exit 109 # Skip the coding agent
