# Update actions/setup-node to v5

## Goal

- All workflows using `actions/setup-node` should be updated to v5.
- If `package-manager-cache` is not set to `true`, it should be added.

## Steps

Update the workflows in `.github/workflows/` directory as below.

### Before

```yaml
steps:
  - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
    with:
      node-version-file: .node-version
```

### After

```yaml
steps:
  - uses: actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5.0.0
    with:
      node-version-file: .node-version
      package-manager-cache: true
```
