# Migrate to Biome

## Goal

- Add Biome
- Remove Prettier and ESLint
- Update CI to use Biome

## Acceptance Criteria

- `package.json` has Biome packages.
- `package.json` does not have Prettier and ESLint packages.
- Biome configuration file is added.
- Prettier and ESLint configuration files are removed.
- CI runs Biome check.

## Steps

The workspace is already migrated by [precondition.sh](./precondition.sh).
Your task is update the below files.

### Remove Prettier and ESLint

If `package.json` has `prettier` and `eslint` commands, remove them.
For example,

```diff
 {
   "private": true,
   "scripts": {
-    "format": "prettier --write **/*.ts",
-    "lint": "eslint .",
   },
 }
```

If any workflow file runs `pnpm lint` or `pnpm format`, replace them with `pnpm biome check --fix`.
For example,

```diff
 jobs:
   test:
     steps:
-      - run: pnpm lint --fix
-      - run: pnpm format
+      - run: pnpm biome check --fix
```

### Run `pnpm biome check` in CI

If `package.json` has `biome` command, remove them.
For example,

```diff
 {
   "private": true,
   "scripts": {
-    "check": "biome check",
   },
 }
```

If any workflow file runs `pnpm run check`, replace it with `pnpm biome check --fix`.
For example,

```diff
 jobs:
   test:
     steps:
-      - run: pnpm run check --fix
+      - run: pnpm biome check --fix
```

### Return the pull request title and body

Understand the current changes using `git diff`.
Return a concise and clear pull request title and body.
