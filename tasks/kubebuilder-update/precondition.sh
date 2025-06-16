#!/bin/bash
set -eux -o pipefail

target_version="$(curl -fsSL https://raw.githubusercontent.com/int128/kubebuilder-updates/refs/heads/main/.kubebuilder-version)"

source_version="$(yq .cliVersion PROJECT)"

if [[ "${target_version}" == "v${source_version}" ]]; then
  exit 99 # up-to-date
fi
