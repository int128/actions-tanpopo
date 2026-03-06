# Update GraphQL config for better IDE support

## Goal

vscode graphql extension supports type-safe features.
This migrates the configuration for better IDE support.

## Steps

### 1. Rename `graphql-codegen.ts` to `graphql.config.ts`

### 2. Update `graphql.config.ts` to use `schema.json`

Before:

```ts
const config: CodegenConfig = {
  schema: `node_modules/@octokit/graphql-schema/schema.graphql`,
```

After:

```ts
const config: CodegenConfig = {
  schema: `./node_modules/@octokit/graphql-schema/schema.json`,
```

### 3. Update `package.json` to use `graphql.config.ts`

Before:

```json
{
  "scripts": {
    "graphql-codegen": "graphql-codegen --config graphql-codegen.ts"
  }
}
```

After:

```json
{
  "scripts": {
    "graphql-codegen": "graphql-codegen --config graphql.config.ts"
  }
}
```

### 4. Regenerate code

```bash
pnpm i
pnpm run graphql-codegen
```
