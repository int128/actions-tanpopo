# Exclude .github/workflows from Biome

## Why

Since Biome v2.6, it formats all yamls including `.github/workflows` by default.

## How

Exclude `.github/workflows` from Biome.

For example:

```yaml
{
  "files": {
    "includes": ["**", "!.github/workflows"]
  }
}
```
