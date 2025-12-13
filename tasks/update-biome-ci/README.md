# Update biome.json in GitHub Actions

## Goal

When `@biomejs/biome` is updated, we want to automatically update the version in `biome.json`.

## Steps

1. Modify the `check` script in `package.json` to run `biome migrate --write` before `biome check --fix`.
   This ensures that any necessary migrations are applied before checking the code.
2. Update the GitHub Actions workflow file (e.g., `.github/workflows/ts.yaml`) to remove the `--fix` flag from the `pnpm run check` command.
   It is already added by step 1, so it is redundant here.
3. Run `pnpm run check` to ensure everything is up to date.

## Example

```diff
diff --git a/.github/workflows/ts.yaml b/.github/workflows/ts.yaml
index 632343f..62ee59a 100644
--- a/.github/workflows/ts.yaml
+++ b/.github/workflows/ts.yaml
@@ -52,5 +52,5 @@ jobs:
           package-manager-cache: false
       - run: npm install -g pnpm@latest-10
       - run: pnpm i
-      - run: pnpm run check --fix
+      - run: pnpm run check
       - uses: int128/update-generated-files-action@d9aac571db84cee6c16fa20190621e9deb2bc575 # v2.67.0
diff --git a/package.json b/package.json
index 9cf9785..e28f0e9 100644
--- a/package.json
+++ b/package.json
@@ -1,7 +1,7 @@
 {
   "private": true,
   "scripts": {
-    "check": "biome check",
+    "check": "biome migrate --write && biome check --fix",
     "build": "ncc build --source-map --license licenses.txt src/index.ts",
     "test": "vitest"
   },
```
