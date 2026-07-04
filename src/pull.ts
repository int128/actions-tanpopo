import assert from 'node:assert'
import * as core from '@actions/core'
import type { Octokit } from '@octokit/action'
import * as git from './git.ts'
import type { Context } from './github.ts'
import type { Task, Workspace } from './task.ts'

type PullRequestInput = {
  title: string
  body: string
}

type PullRequestOutput = {
  number: number
  html_url: string
}

export const openPullRequestWithWorkspaceChange = async (
  input: PullRequestInput,
  task: Task,
  workspace: Workspace,
  context: Context,
  octokit: Octokit,
): Promise<PullRequestOutput | undefined> => {
  const gitStatus = await git.status(workspace)
  if (gitStatus === '') {
    return
  }

  const { data: repository } = await octokit.rest.repos.get(workspace.repository)
  const baseBranch = repository.default_branch
  const headBranch = `bot--tasks-${task.name.replaceAll(/[^\w]/g, '-')}`
  const workflowRunUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`
  await git.commit(workspace, input.title, [workflowRunUrl])

  const signedCommitSHA = await signCommit(workspace, octokit)
  await git.push(workspace, signedCommitSHA, `refs/heads/${headBranch}`)

  const pull = await openPullRequest(
    {
      owner: workspace.repository.owner,
      repo: workspace.repository.repo,
      title: input.title,
      head: headBranch,
      base: baseBranch,
      body: input.body,
    },
    octokit,
  )
  await octokit.rest.pulls.requestReviewers({
    owner: workspace.repository.owner,
    repo: workspace.repository.repo,
    pull_number: pull.number,
    reviewers: [context.actor],
  })
  core.info(`Requested review from ${context.actor} for pull request: ${pull.html_url}`)

  if (task.metadata.enablePullRequestAutoMerge) {
    let method: string
    if (repository.allow_squash_merge) {
      method = 'SQUASH'
    } else if (repository.allow_rebase_merge) {
      method = 'REBASE'
    } else {
      method = 'MERGE'
    }
    try {
      await enablePullRequestAutoMerge(pull.node_id, method, octokit)
      core.info(`Enabled auto-merge for pull request: ${pull.html_url}`)
    } catch (error) {
      core.warning(`Failed to enable auto-merge: ${error}`)
    }
  }
  return pull
}

const signCommit = async (workspace: Workspace, octokit: Octokit) => {
  const unsignedCommitSHA = await git.getCommitSHA(workspace, 'HEAD')
  const signingBranch = `signing--${unsignedCommitSHA}`
  await git.push(workspace, 'HEAD', `refs/heads/${signingBranch}`)
  try {
    const { data: unsigned } = await octokit.rest.repos.getBranch({
      owner: workspace.repository.owner,
      repo: workspace.repository.repo,
      branch: signingBranch,
    })
    const { data: signedCommit } = await octokit.rest.git.createCommit({
      owner: workspace.repository.owner,
      repo: workspace.repository.repo,
      message: unsigned.commit.commit.message,
      tree: unsigned.commit.commit.tree.sha,
      parents: unsigned.commit.parents.map((parent) => parent.sha),
    })
    await octokit.rest.git.updateRef({
      owner: workspace.repository.owner,
      repo: workspace.repository.repo,
      ref: `heads/${signingBranch}`,
      sha: signedCommit.sha,
      force: true,
    })
    await git.fetch(workspace, signedCommit.sha)
    return signedCommit.sha
  } finally {
    await git.deleteRef(workspace, `refs/heads/${signingBranch}`)
  }
}

type RawPullRequestInput = {
  owner: string
  repo: string
  title: string
  head: string
  base: string
  body: string
}

const openPullRequest = async (pull: RawPullRequestInput, octokit: Octokit) => {
  const { data: existingPulls } = await octokit.pulls.list({
    owner: pull.owner,
    repo: pull.repo,
    state: 'open',
    head: `${pull.owner}:${pull.head}`,
    per_page: 1,
  })
  if (existingPulls.length > 0) {
    assert(existingPulls[0] !== undefined, 'existingPulls should be non-empty')
    const existingPull = existingPulls[0]
    core.info(`Pull request already exists: ${existingPull.html_url}`)
    assert.strictEqual(existingPull.head.ref, pull.head)
    const { data: updatedPull } = await octokit.pulls.update({
      owner: pull.owner,
      repo: pull.repo,
      pull_number: existingPull.number,
      title: pull.title,
      body: pull.body,
    })
    core.info(`Updated pull request: ${updatedPull.html_url}`)
    return updatedPull
  }
  const { data: createdPull } = await octokit.pulls.create(pull)
  core.info(`Created pull request: ${createdPull.html_url}`)
  return createdPull
}

const enablePullRequestAutoMerge = async (pullRequestId: string, mergeMethod: string, octokit: Octokit) => {
  await octokit.graphql(
    `
    mutation ($pullRequestId: ID!, $mergeMethod: PullRequestMergeMethod!) {
      enablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }) {
        clientMutationId
      }
    }
  `,
    { pullRequestId, mergeMethod },
  )
}
