#!/bin/bash

if [ ! -d .github/workflows ]; then
  exit 99 # skip this task
fi

if yq . .github/workflows/*.yaml > /dev/null; then
  exit 99 # skip this task
fi

exit 0
