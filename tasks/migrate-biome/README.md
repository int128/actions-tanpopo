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

### Replace the packages

```bash
pnpm add -D -E @biomejs/biome
pnpm remove @eslint/js eslint prettier typescript-eslint @vitest/eslint-plugin
```

### Create `biome.json`

```json
{
  "$schema": "https://biomejs.dev/schemas/2.2.4/schema.json",
  "formatter": {
    "indentStyle": "space",
    "lineWidth": 120
  },
  "linter": {
    "enabled": true
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded"
    }
  }
}
```

### Remove the following files

- `.prettierignore`
- `prettier.config.js`
- `eslint.config.js`

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

### Verify

```bash
pnpm biome migrate --write
pnpm run check --fix
```

If it reports any errors, leave them.
You don't need to fix them manually.
