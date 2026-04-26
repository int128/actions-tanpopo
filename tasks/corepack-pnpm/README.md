# Use corepack to pin pnpm version

## Purpose

Pin the pnpm version using corepack.
This ensures that all developers and CI environments use the same version of pnpm, which can help avoid issues caused by version discrepancies.

## Changes

Before:

```yaml
- uses: actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f # v6.3.0
  with:
    node-version-file: .node-version
    package-manager-cache: false
- run: npm install -g pnpm@latest-10
- run: pnpm i
```

After:

```yaml
- uses: actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f # v6.3.0
  with:
    node-version-file: .node-version
- run: npm install -g corepack
- run: corepack enable
- run: pnpm i
```
