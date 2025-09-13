# Manage Node.js version using .node-version file

## Goal

Ensure the Node.js version is consistent across different environments by using a `.node-version` file.

## How

1. Find the current Node.js version from `actions/setup-node` in the GitHub Actions workflows.
2. Create a `.node-version` file in the root of your repository with the Node.js version found in step 1.
3. Change the `actions/setup-node` step in your GitHub Actions workflows to read the Node.js version from the `.node-version` file.

### Example

Before:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20.19.5
```

After:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version-file: .node-version
```

## Acceptance Criteria

- A `.node-version` file is created in the root of the repository with the correct Node.js version.
- All `actions/setup-node` steps in GitHub Actions workflows are updated to use the `.node-version` file.
