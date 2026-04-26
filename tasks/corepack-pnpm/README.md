# Use corepack to pin pnpm version

## Purpose

This task is used to pin the pnpm version using corepack.
This ensures that all developers and CI environments use the same version of pnpm, which can help avoid issues caused by version discrepancies.

## Acceptance Criteria

- All workflows should not install pnpm globally using npm.
- All workflows should install corepack globally using npm and enable it before installing pnpm.

## Steps

Find the workflows in `.github/workflows` directory.
Change the jobs that install pnpm to use corepack instead.

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

### Rules

- If `actions/setup-node` has `package-manager-cache` key, remove it.
- Do not touch any files other than `.github/workflows` directory.
