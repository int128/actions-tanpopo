# Upgrade kubebuilder to v4.5.2

## Goal

Update the project to use kubebuilder v4.5.2.

## Doc

https://github.com/int128/kubebuilder-updates?tab=readme-ov-file#update-kubebuilder-from-v451-to-v452

## Steps

Apply the patch to update the project from v4.5.1 to v4.5.2:

```bash
git fetch https://github.com/int128/kubebuilder-updates cbcad932011cd36db023cada2ec80caefa85f723
git cherry-pick cbcad932011cd36db023cada2ec80caefa85f723
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

If go.mod or go.sum have conflicts, use the current project's version.

You don't need to commit the changes.

Finally, run the following commands to update the project:

```bash
make generate manifests
```
