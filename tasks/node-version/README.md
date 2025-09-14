# Manage Node.js version using .node-version file

## Goal

Ensure the Node.js version is consistent across different environments by using a `.node-version` file.

## Acceptance Criteria

- A `.node-version` file is created in the root of the repository.
- All `actions/setup-node` steps in the GitHub Actions workflows have `node-version-file` instead of `node-version`.

## How

1. Find the current Node.js version from `node-version` input of `actions/setup-node` in the GitHub Actions workflows.
2. Create a `.node-version` file in the root of your repository.
3. Find the GitHub Actions workflows that use `actions/setup-node`. Replace all occurrences of `node-version` with `node-version-file`.

### Migration Example

Before:

```yaml
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: 20.19.5
```

After:

```yaml
steps:
  - uses: actions/setup-node@v4
    with:
      node-version-file: .node-version
```
