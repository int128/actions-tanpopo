#!/bin/bash
set -eux -o pipefail

if [ -f graphql.config.ts ]; then
  exit 99
fi

if [ ! -f graphql-codegen.ts ]; then
  exit 99
fi
