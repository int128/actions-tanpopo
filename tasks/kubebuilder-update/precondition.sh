#!/bin/bash
set -eux -o pipefail

target_version="4.16.0"

source_version="$(yq .cliVersion PROJECT)"

if [[ $target_version == $source_version ]]; then
  exit 99 # up-to-date
fi

if [ ! -x /usr/local/bin/kubebuilder ]; then
  curl -sfL -o kubebuilder "https://go.kubebuilder.io/dl/latest/$(go env GOOS)/$(go env GOARCH)"
  chmod +x kubebuilder
  sudo mv kubebuilder /usr/local/bin/
fi
kubebuilder version

export GOTOOLCHAIN=auto

# kubebuilder assumes that main branch exists.
git checkout -b main

kubebuilder alpha update --force

# kubebuilder created a new commit at this time. Reset the changes to the working tree.
git reset HEAD^
git add .
git restore -s HEAD \
  .github/workflows \
  .devcontainer \
  .golangci.* \
  go.* \
  test \
  AGENTS.md \
  README.md
git add .
git reset
