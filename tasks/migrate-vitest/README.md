# Migrate to vitest

## Issue

- https://github.com/int128/typescript-action/issues/1068

## Goal

This task migrates the project from Jest to Vitest.

## Prerequisite

If the workspace has `vitest.config.ts`, you don't need to do this task.
Stop.

## Steps

Create a temporary file of the following content and run it:

```bash
#!/bin/bash
set -eux -o pipefail

pnpm remove @types/jest jest ts-jest eslint-plugin-jest
rm jest.config.js
pnpm add -D vitest @vitest/eslint-plugin

perl -i -pne 's/"jest"/"vitest"/' package.json
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

Update the files of glob pattern `**/*.test.ts` as follows:

- If a test file has the following function calls, add an import declaration to the first line of the file. For example, add `import { expect } from 'vitest'`.
  - `expect()`
  - `it()`
  - `describe()`
  - `test()`
- If a test file has the following function calls, migrate it from Jest to Vitest.
  - `jest.mock()`
  - `jest.mocked()`
