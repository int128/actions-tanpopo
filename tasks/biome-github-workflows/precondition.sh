#!/bin/bash
set -eux -o pipefail

if [ ! -f biome.json ]; then
  exit 99 # skip the task
fi

tmp_file="$(mktemp biome.json.XXXXXX)"
jq '
  .files = (.files // {})
  | .files.includes = (
      (.files.includes // ["**"])
      | if index("!.github/workflows") then . else . + ["!.github/workflows"] end
    )
' biome.json > "$tmp_file"
mv "$tmp_file" biome.json

pnpm i
pnpm biome migrate --write
pnpm biome check --fix

exit 109 # Skip the coding agent
