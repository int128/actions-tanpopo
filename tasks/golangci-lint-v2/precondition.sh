#!/bin/bash
set -eux -o pipefail

if grep github.com/golangci/golangci-lint/v2/cmd/golangci-lint go.mod; then
  exit 99 # skip the task
fi
