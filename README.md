# actions-tanpopo [![ts](https://github.com/int128/actions-tanpopo/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/actions-tanpopo/actions/workflows/ts.yaml)

Automate routine tasks for each repository.

## Purpose

If you have a lot of repositories, you may want to automate a routine task for each repository.
For example,

- Update configuration files
- Migrate from one tool to another
- Apply consistent security policies
- Update documentations
- Convert file formats

This action handles the repetitive work of updating multiple repositories, similar to placing dandelions on sashimi ("刺身にたんぽぽを乗せる仕事" in Japanese) - a routine yet precise task that benefits from automation.

## Getting started

This action performs a task for each repository.

Describe a task in the repository as follows:

- `tasks/<task-name>/README.md`
  - The details of the task.
  - This action understands the instruction using LLM.
- `tasks/<task-name>/repositories`
  - The list of repositories to be updated.
  - Each line should be in the format of `owner/repo`.
- `tasks/<task-name>/precondition.sh`
  - A script to determine if it needs to apply this task to a repository.
  - If this script exits with code 0, this action will apply the task to the repository.
  - If this script exits with code 99, this action will skip the repository.

When you create a pull request with changing a task directory, this action will perform the task.

## Setup

### Create a GitHub App

Create your GitHub App from [this link](https://github.com/settings/apps/new?webhook_active=false&url=https://github.com/int128/actions-tanpopo&contents=write&issues=write&pull_requests=write&workflows=write).
Here are the required permissions:

- Contents: read and write
- Pull Requests: read and write
- Workflows: read and write

Install the GitHub App to your repositories.

### Create a workflow

Create a workflow to run this action.
See [bot.yaml](.github/workflows/bot.yaml).
