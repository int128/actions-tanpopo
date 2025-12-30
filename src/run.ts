import assert from 'node:assert'
import * as fs from 'node:fs/promises'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import type { Octokit } from '@octokit/action'
import * as git from './git.ts'
import type { Context } from './github.ts'
import { performTask, parseTask, type Task } from './task.ts'

type Inputs = {
  tasks: string[]
}

export const run = async (inputs: Inputs, octokit: Octokit, context: Context) => {
  core.info(`Processing tasks: ${inputs.tasks.join(', ')}`)
  for (const taskName of inputs.tasks) {
    core.info(`== Task ${taskName}`)
    core.summary.addHeading(`Task ${taskName}`, 1)
    const task = await parseTask(taskName, context)
    await processTask(task, octokit, context)
  }
}

const processTask = async (task: Task, octokit: Octokit, context: Context) => {
  let commentId: number | undefined
  const pulls = []
  for (const repository of task.repositories) {
    core.info(`=== ${repository}`)
    const pull = await processRepository(repository, task, octokit, context)
    if (!pull) {
      continue
    }
    pulls.push(pull)
    if ('number' in context.payload) {
      const body = pulls.map((pull) => `- ${pull.html_url}`).join('\n')
      if (commentId === undefined) {
        const comment = await octokit.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: context.payload.number,
          body,
        })
        commentId = comment.data.id
      } else {
        await octokit.rest.issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: commentId,
          body,
        })
      }
    }
  }
}

const processRepository = async (repository: string, task: Task, octokit: Octokit, context: Context) => {
  const workspace = await fs.mkdtemp(`${context.runnerTemp}/workspace-`)
  process.chdir(workspace)
  core.info(`Moved to a workspace ${workspace}`)
  await git.clone(repository, context)

  const precondition = await exec.exec('bash', [task.preconditionScriptPath], {
    ignoreReturnCode: true,
  })
  if (precondition === 99) {
    core.info(`Skip the task by precondition.sh`)
    return
  }
  if (precondition !== 0) {
    throw new Error(`precondition failed with exit code ${precondition}`)
  }

  core.summary.addHeading(`Repository ${repository}`, 2)
  const taskResponse = await performTask(task, context)
  if (taskResponse === null) {
    return
  }

  const gitStatus = await git.status()
  if (gitStatus === '') {
    return
  }
  const baseBranch = (await git.getDefaultBranch()) ?? 'main'
  const headBranch = `bot--tasks-${task.name.replaceAll(/[^\w]/g, '-')}`
  const workflowRunUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`
  await git.commit(taskResponse.title, [workflowRunUrl])

  const [owner, repo] = repository.split('/')
  assert(owner, 'repository must have an owner part')
  assert(repo, 'repository must have a repo part')
  const signedCommitSHA = await signCommit(owner, repo, octokit)
  await git.push(signedCommitSHA, `refs/heads/${headBranch}`)

  const pull = await createOrUpdatePullRequest(octokit, {
    owner,
    repo,
    title: taskResponse.title,
    head: headBranch,
    base: baseBranch,
    body: taskResponse.body,
  })
  await octokit.rest.pulls.requestReviewers({
    owner,
    repo,
    pull_number: pull.number,
    reviewers: [context.actor],
  })
  core.info(`Requested review from ${context.actor} for pull request: ${pull.html_url}`)

  core.summary.addHeading('Pull request for the task', 3)
  core.summary.addLink(`${repository}#${pull.number}`, pull.html_url)
  await core.summary.write()
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

type CreateOrUpdatePullRequest = {
  owner: string
  repo: string
  title: string
  head: string
  base: string
  body: string
}

const createOrUpdatePullRequest = async (octokit: Octokit, pull: CreateOrUpdatePullRequest) => {
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
