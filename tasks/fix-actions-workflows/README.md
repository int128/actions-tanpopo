# Fix the GitHub Actions workflows

## Goal

Repair the GitHub Actions workflows in the repository.

## Steps

Run `jq . .github/workflows/*.yaml` to validate the YAML syntax.
If there are any syntax errors, fix them.
