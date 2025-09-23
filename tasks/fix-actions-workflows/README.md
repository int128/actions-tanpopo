# Fix the GitHub Actions workflows

## Goal

Repair the GitHub Actions workflows in the repository.

## Acceptance Criteria

- Use `jq` to validate the syntax of the workflows.
- Any step (such as `uses: actions/checkout`) is not removed from the `steps` of the workflows.
