#!/bin/bash

perl -i -pe 's/"github>int128\/typescript-action-renovate-config"/"github>int128\/typescript-action-renovate-config#v1.9.0"/g' .github/renovate.json*

exit 0
