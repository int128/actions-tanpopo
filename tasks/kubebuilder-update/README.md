# Update to kubebuilder v4.6.0

## Goal

Update the project to the latest version of kubebuilder.

## Prerequisites

Find the latest patch from the repository https://github.com/int128/kubebuilder-updates.
The README.md file contains the list of patches for each version of kubebuilder.
This instruction assumes that the patch is for kubebuilder v4.6.0 or later.

Check the current version of the project from `cliVersion` field of `PROJECT` file.
If it does not has `cliVersion` field, assumes that the project is using kubebuilder v4.5.2.

The goal of this task is resolving the conflicts after applying the patch.
Do not commit the change by git commit or git cherry-pick --continue.

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

- If you find an example symbol such as `Guestbook` in the patch, keep the original lines.
- `go.mod`
  - Use the original file.
- `go.sum`
  - After resolving the conflicts, run `go mod tidy` to update the file.
- `Dockerfile`
  - If you encounter a conflict of the build platform such as `--platform=$BUILDPLATFORM`, keep the original lines.
- `Makefile`
  - If you encounter a conflict of a dependency version, choose the newer one.

Finally, run the following commands to update the project:

```bash
make generate manifests
```
