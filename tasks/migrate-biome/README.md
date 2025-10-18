# Migrate to Biome

## Goal

- Add Biome
- Remove Prettier and ESLint
- Update CI to use Biome

## Acceptance Criteria

- `package.json` has Biome packages.
- `package.json` does not have Prettier and ESLint packages.
- `pnpm run check` executes Biome check.
- `biome.json` configuration file is added.
- Prettier and ESLint configuration files are removed.
- `.github/workflows/*.yaml` runs Biome check.

## Steps

The workspace is already migrated by [precondition.sh](./precondition.sh).
Your task is update the below files.

### Update `package.json` to run Biome check

For example,

```diff
 {
   "private": true,
   "scripts": {
-    "format": "prettier --write **/*.ts",
-    "lint": "eslint .",
+    "check": "biome check",
   },
 }
```

### Update `.github/workflows/*.yaml` to run Biome check

For example,

```diff
 jobs:
   test:
     steps:
-      - run: pnpm lint --fix
-      - run: pnpm format
+      - run: pnpm run check --fix
```
