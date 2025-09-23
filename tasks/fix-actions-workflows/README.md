# Fix the GitHub Actions workflows

## Goal

Repair the GitHub Actions workflows in the repository.

## Acceptance Criteria

- The validation command `yq . .github/workflows/*.yaml` succeeds without errors.
- Any step (such as `uses: actions/checkout`) is not removed from the `steps` of the workflows.
