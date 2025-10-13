# Manage Node.js version using .node-version file

## Goal

Ensure the Node.js version is consistent across different environments by using a `.node-version` file.

## Acceptance Criteria

- If `.github/workflows/*.yaml` files do not exist, you don't need to do anything.
- `.node-version` exists in the root of the repository.
- For all GitHub Actions workflows, all `actions/setup-node` steps have `node-version-file` instead of `node-version`.

## Steps

### Find the current Node.js version

Find the current Node.js version from `node-version` input of `actions/setup-node` in the GitHub Actions workflows.
If the current version is `20`, use `20.19.5` instead.

### Create the .node-version file

Create a `.node-version` file in the root of your repository.

### Migrate the GitHub Actions workflows

Find the GitHub Actions workflows that use `actions/setup-node`.
Replace all occurrences of `node-version` with `node-version-file`.

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
