# actions-tanpopo [![ts](https://github.com/int128/actions-tanpopo/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/actions-tanpopo/actions/workflows/ts.yaml)

This action automates routine tasks across multiple repositories.

## Purpose

For users managing numerous repositories, automating routine tasks is crucial.
For example,

- Update configuration files
- Migrate from one tool to another
- Apply consistent security policies
- Update documentations
- Convert file formats

This action streamlines the repetitive process of updating multiple repositories, akin to the meticulous task of placing dandelions on sashimi ("刺身にたんぽぽを乗せる仕事" in Japanese)—a routine yet precise effort that greatly benefits from automation.

## Getting started

This action executes a defined task for each specified repository.

Describe a task in the repository as follows:

- `tasks/<task-name>/README.md`
This action interprets instructions using a Large Language Model (LLM).
  - This action understands the instruction using LLM.
- `tasks/<task-name>/repositories`
  - The list of repositories to be updated.
  - Each line should be in the format of `owner/repo`.
- `tasks/<task-name>/precondition.sh`
  - A script to determine if it needs to apply this task to a repository.
  - If this script exits with code 0, this action will apply the task to the repository.
  - If this script exits with code 99, this action will skip the repository.

When a pull request modifies a task directory, this action automatically executes the defined task.

## Setup

### Create a GitHub App
Create your GitHub App using [this link](https://github.com/settings/apps/new?webhook_active=false&url=https://github.com/int128/actions-tanpopo&contents=write&issues=write&pull_requests=write&workflows=write).
The following permissions are required:
Here are the required permissions:

- Contents: read and write
- Pull Requests: read and write
- Workflows: read and write

Install the GitHub App to your repositories.

### Create a workflow

Create a workflow to run this action.

```yaml
name: bot

on:
  pull_request:
    paths:
      - tasks/**
      - .github/workflows/bot.yaml

concurrency:
  cancel-in-progress: true
  group: ${{ github.workflow }}--${{ github.event.pull_request.id }}--${{ github.actor }}

jobs:
  run:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/create-github-app-token@df432ceedc7162793a195dd1713ff69aefc7379e # v2.0.6
        id: token
        with:
          app-id: ${{ secrets.BOT_APP_ID }}
          private-key: ${{ secrets.BOT_APP_PRIVATE_KEY }}
          owner: ${{ github.repository_owner }}
      - uses: int128/actions-tanpopo@v0
        with:
          token: ${{ steps.token.outputs.token }}
```
