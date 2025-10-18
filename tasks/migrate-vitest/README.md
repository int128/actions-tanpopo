# Migrate to vitest

## Issue

- https://github.com/int128/typescript-action/issues/1068

## Goal

This task migrates the project from Jest to Vitest.

## Prerequisite

If the workspace has `vitest.config.ts`, you don't need to do this task.
Stop.

## Steps

Replace Jest with Vitest packages:

```bash
pnpm remove @types/jest jest ts-jest eslint-plugin-jest
rm jest.config.js
pnpm add -D vitest @vitest/eslint-plugin
```

Fix the configuration files as follows:

- `package.json`
  - Replace `jest` with `vitest`.
- `eslint.config.js`
  - Replace the import statement as follows:
    - From `import jest from ...`
    - To `import vitest from '@vitest/eslint-plugin'`
  - Replace the configuration as follows:
    - From `jest.configs['flat/recommended']`
    - To `vitest.configs.recommended`

Create `vitest.config.ts` as follows:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    clearMocks: true,
  },
})
```

### Migration

Run the following command to check if the migration is successful:

```bash
pnpm run test
pnpm run lint
pnpm run format
pnpm run build
```

Here is the recommendation for the migration:

- If you use `jest.mock`, replace it with `vi.mock`.
- You need to explicitly import the test functions such as `describe`, `it`, and `expect` in the test files.
  To import them, insert the following line to the top of a test file:
  ```ts
  import { describe, it, expect } from 'vitest'
  ```
