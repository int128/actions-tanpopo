# Add wait-for-workflows workflow

## Goal

This adds wait-for-workflows workflow for the status check of branch ruleset.

## Instructions

The workflow is already added.

You need to enable platformAutomerge in `.github/renovate.json` or `.github/renovate.json5`.
Here is an example:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "github>int128/renovate-base",
    "github>int128/typescript-action-renovate-config#v1.10.0",
    "helpers:pinGitHubActionDigests"
  ],
  "platformAutomerge": true
}
```
