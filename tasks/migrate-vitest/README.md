# Migrate to vitest

## Issue

- https://github.com/int128/typescript-action/issues/1068

## Goal

This task migrates the project from Jest to Vitest.

## Prerequisite

If the workspace has `vitest.config.ts`, you don't need to do this task.
Stop immediately.

## Steps

Remove the Jest dependencies.

```bash
pnpm remove @types/jest jest ts-jest eslint-plugin-jest
rm jest.config.js
```

Add the Vitest dependencies.

```bash
pnpm add -D vitest @vitest/eslint-plugin
```

Fix `package.json`.

```bash
perl -i -pne 's/"jest"/"vitest"/' package.json
```

Fix `eslint.config.js`.

```bash
perl -i -pne "s/^import jest .+/import vitest from '\@vitest\/eslint-plugin'/" eslint.config.js
perl -i -pne "s/jest\.configs\[.+/vitest.configs.recommended,/" eslint.config.js
```

Create `vitest.config.ts` as follows:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    clearMocks: true,
  },
})
```

Apply the following steps to the files of glob pattern `**/*.test.ts`:

- If the test file has the following function calls, you need to import them.
  - `expect()`
  - `it()`
  - `describe()`
  - `test()`
- To import functions, add an import declaration to the first line of the file.
  For example, add `import { expect } from 'vitest'`.
