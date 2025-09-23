#!/bin/bash

if yq . .github/workflows/*.yaml; then
  exit 99 # skip this task
fi

exit 0
