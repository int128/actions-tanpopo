#!/bin/bash

perl -i -pe 's/"github>int128\/typescript-action-renovate-config"/"github>int128\/typescript-action-renovate-config#v1.9.0"/g' .github/renovate.json*

if [ -z "$(git status --porcelain)" ]; then
  exit 99 # skip the task
fi

exit 0
