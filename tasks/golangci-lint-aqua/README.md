# Manage golangci-lint by aqua

## Goal

Manage the version of linting tool `github.com/golangci/golangci-lint` by aqua.
[Aqua](https://github.com/aquaproj/aqua) is a version manager for command-line tools.

## Prerequisites

If `go.mod` contains `github.com/golangci/golangci-lint`, run this task.
Otherwise, you don't need to run this task.

## Procedure

### 1. Create `aqua.yaml`

Create `aqua.yaml` in the workspace with the following content:

```yaml
---
# yaml-language-server: $schema=https://raw.githubusercontent.com/aquaproj/aqua/main/json-schema/aqua-yaml.json
# aqua - Declarative CLI Version Manager
# https://aquaproj.github.io/
# checksum:
#   enabled: true
#   require_checksum: true
#   supported_envs:
#   - all
registries:
  - type: standard
ref: v4.371.0 # renovate: depName=aquaproj/aqua-registry
packages:
  - name: golangci/golangci-lint@v1.64.8
```

### 2. Remove tools directory

If the workspace contains the following files, remove them:

- `tools` directory
- `go.work`
- `go.work.sum`

### 3. Modify the GitHub Actions workflow

Find the lint job in `.github/workflows/` directory.
If the lint job exists, modify it as follows:

- If the job runs golangci-lint by `go tool`, replace it with `golangci-lint run`.
- If the job uses `actions/setup-go`, fetch the Go version from `go.mod` and set it to `go-version`.

Before:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-go@d35c59abb061a4a6fb18e82ac0862c26744d6ab5 # v5.5.0
        with:
          go-version-file: go.work
          cache-dependency-path: go.work.sum
      - run: go tool github.com/golangci/golangci-lint/cmd/golangci-lint run
```

After:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - id: toolchain
        run: echo "version=$(sed -ne '/^toolchain /s/^toolchain go//p' go.mod)" >> "$GITHUB_OUTPUT"
      - uses: actions/setup-go@d35c59abb061a4a6fb18e82ac0862c26744d6ab5 # v5.5.0
        with:
          go-version: ${{ steps.toolchain.outputs.version }}
          cache-dependency-path: go.sum
      - uses: aquaproj/aqua-installer@9ebf656952a20c45a5d66606f083ff34f58b8ce0 # v4.0.0
        with:
          aqua_version: v2.43.1
      - run: golangci-lint run
```
