# Migrate golangci-lint to v2

## Goal

Update the linting tool `github.com/golangci/golangci-lint` to v2.

## Steps

Replace golangci-lint v1 with v2:

```bash
go get -tool github.com/golangci/golangci-lint/v2/cmd/golangci-lint
go mod edit -droptool=github.com/golangci/golangci-lint/cmd/golangci-lint
go mod tidy
```

Fix the configuration files as follows:

- `Makefile`
  - If `lint` task runs `go tool github.com/golangci/golangci-lint/cmd/golangci-lint run`, replace it with `go tool golangci-lint run`.
  - If it does not have `lint` task, add it with the command `go tool golangci-lint run`.

### Migration

Run the following command to check if the migration is successful:

```bash
make lint
go fmt
```

Here is the recommendation for the migration:

- For `errcheck` error, you need to add error handling for the function.
  - Here is an example of how to add error handling:
    ```go
    defer func() {
      if err := f.Close(); err != nil {
        log.Printf("Failed to close the file: %v", err)
      }
    }()
    ```
