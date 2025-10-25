#!/bin/bash
set -eux -o pipefail

if [ ! -f .github/renovate.json* ]; then
  exit 99 # skip the task
fi

perl -i -pe 's/github>int128\/go-renovate-config#v1.7.2/github>int128\/go-renovate-config#v1.8.0/g' .github/renovate.json*

perl -i -pe 's/ +"github>int128\/go-renovate-config:github-actions#v1.7.2",?\n//g' .github/renovate.json*

perl -i -pe 's/github>int128\/go-renovate-config:kustomization-github-releases#v1.7.2/github>int128\/go-renovate-config:github-releases#v1.8.0(**\/kustomization.yaml)/g' .github/renovate.json*

perl -i -pe 's/github>int128\/go-renovate-config:doc-github-releases#v1.7.2/github>int128\/go-renovate-config:github-releases#v1.8.0(README.md)/g' .github/renovate.json*

if [ -z "$(git status --porcelain)" ]; then
  exit 99 # skip the task
fi

exit 0
