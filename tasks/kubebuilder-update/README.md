# Update the project to the latest version of kubebuilder

## Goal

Update the project to the latest version of kubebuilder.

This repository provides the patches to update the project.
https://github.com/int128/kubebuilder-updates

## Prerequisites

Find the latest patch from https://github.com/int128/kubebuilder-updates/blob/main/README.md.
The README file contains the list of patches for each version of kubebuilder.
This instruction assumes that the patch is for kubebuilder v4.6.0 or later.

Check the current version of the project from `cliVersion` field of `PROJECT` file.
If it does not has `cliVersion` field, assumes that the project is using kubebuilder v4.5.2.

## Steps

Apply the patch to update the project:

```bash
git fetch https://github.com/int128/kubebuilder-updates PATCH_COMMIT_SHA
git cherry-pick PATCH_COMMIT_SHA
```

Check the conflicts.

```bash
git status --short --branch
```

If a file does not exist in the project, remove it.
For example, git status shows the following:

```
M  Makefile
M  cmd/main.go
DU config/crd/bases/webapp.int128.github.io_guestbooks.yaml
M  config/default/kustomization.yaml
M  config/prometheus/monitor_tls_patch.yaml
UU go.mod
UU go.sum
DU internal/controller/guestbook_controller.go
DU test/e2e/e2e_suite_test.go
DU test/e2e/e2e_test.go
```

Then, remove the following files:

- `config/crd/bases/webapp.int128.github.io_guestbooks.yaml`
- `internal/controller/guestbook_controller.go`
- `test/e2e/e2e_suite_test.go`
- `test/e2e/e2e_test.go`

Resolve the conflicts as follows:

- go.mod
  - Use the original version.
- go.sum
  - After resolving the conflicts, run `go mod tidy` to update the file.
- Others
  - Apply the merged changes.

Do not run `git cherry-pick --continue`.

Finally, run the following commands to update the project:

```bash
make generate manifests
```
