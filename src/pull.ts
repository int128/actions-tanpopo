import assert from 'node:assert'
import * as core from '@actions/core'
import type { Octokit } from '@octokit/action'
import * as git from './git.ts'
import type { Context } from './github.ts'

type PullRequestInput = {
  taskName: string
  repository: string
  title: string
  body: string
}

type PullRequestOutput = {
  number: number
  html_url: string
}

export const openPullRequestWithWorkspaceChange = async (
  input: PullRequestInput,
  context: Context,
  octokit: Octokit,
): Promise<PullRequestOutput | undefined> => {
  const gitStatus = await git.status()
  if (gitStatus === '') {
    return
  }

  const baseBranch = (await git.getDefaultBranch()) ?? 'main'
  const headBranch = `bot--tasks-${input.taskName.replaceAll(/[^\w]/g, '-')}`
  const workflowRunUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`
  await git.commit(input.title, [workflowRunUrl])

  const [owner, repo] = input.repository.split('/')
  assert(owner, 'repository must have an owner part')
  assert(repo, 'repository must have a repo part')
  const signedCommitSHA = await signCommit(owner, repo, octokit)
  await git.push(signedCommitSHA, `refs/heads/${headBranch}`)

  const pull = await openPullRequest(
    {
      owner,
      repo,
      title: input.title,
      head: headBranch,
      base: baseBranch,
      body: input.body,
    },
    octokit,
  )
  await octokit.rest.pulls.requestReviewers({
    owner,
    repo,
    pull_number: pull.number,
    reviewers: [context.actor],
  })
  core.info(`Requested review from ${context.actor} for pull request: ${pull.html_url}`)
  return pull
}

const signCommit = async (owner: string, repo: string, octokit: Octokit) => {
  const unsignedCommitSHA = await git.getCommitSHA('HEAD')
  const signingBranch = `signing--${unsignedCommitSHA}`
  await git.push('HEAD', `refs/heads/${signingBranch}`)
  try {
    const { data: unsigned } = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch: signingBranch,
    })
    const { data: signedCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: unsigned.commit.commit.message,
      tree: unsigned.commit.commit.tree.sha,
      parents: unsigned.commit.parents.map((parent) => parent.sha),
    })
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${signingBranch}`,
      sha: signedCommit.sha,
      force: true,
    })
    await git.fetch(signedCommit.sha)
    return signedCommit.sha
  } finally {
    await git.deleteRef(`refs/heads/${signingBranch}`)
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
