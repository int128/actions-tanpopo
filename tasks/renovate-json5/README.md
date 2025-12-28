# Migrate renovate.json5 to renovate.json

## Goal

- Rename `.github/renovate.json5` to `.github/renovate.json`
- Convert JSON5 content to standard JSON format
- Add the json schema reference if missing
- Replace `config:base` preset with `github>int128/renovate-base` preset
- Keep existing configurations intact

## Example

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "github>int128/renovate-base",
    "helpers:pinGitHubActionDigests"
  ]
}
```
