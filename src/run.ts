import assert from 'node:assert'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import type { Octokit } from '@octokit/action'
import type { PullRequestEvent, WebhookEvent } from '@octokit/webhooks-types'
import { runCodingAgent } from './coding/agent.js'
import * as git from './git.js'
import { type Context, contextIsPullRequestEvent } from './github.js'

export const run = async (octokit: Octokit, context: Context<WebhookEvent>): Promise<void> => {
  if (contextIsPullRequestEvent(context)) {
    core.info(`Processing ${context.payload.pull_request.html_url}`)
    await processPullRequest(octokit, context)
    return
  }
}

const processPullRequest = async (octokit: Octokit, context: Context<PullRequestEvent>) => {
  const { data: files } = await octokit.pulls.listFiles({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.payload.number,
    per_page: 100,
  })
  const taskDirs = new Set(files.map((file) => path.dirname(file.filename)).filter((dir) => dir.startsWith('tasks/')))
  if (taskDirs.size === 0) {
    core.info('Running the smoke test')
    await processTask('tasks/example', octokit, context)
    return
  }

  core.info(`Processing tasks: ${[...taskDirs].join(', ')}`)
  for (const taskDir of taskDirs) {
    await processTask(taskDir, octokit, context)
  }
}

const processTask = async (taskDir: string, octokit: Octokit, context: Context<PullRequestEvent>) => {
  core.summary.addHeading(`Task ${taskDir}`, 1)

  let commentId: number | undefined
  const pulls = []
  const repositories = parseRepositoriesFile(await fs.readFile(path.join(taskDir, 'repositories'), 'utf-8'))
  for (const repository of repositories) {
    core.info(`=== ${repository}`)
    const pull = await createOrUpdatePullRequestForTask(taskDir, repository, octokit, context)
    if (!pull) {
      continue
    }
    pulls.push(pull)
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

const parseRepositoriesFile = (repositories: string): string[] => [
  ...new Set(
    repositories
      .split('\n')
      .map((line) => line.replace(/#.*$/, '').trim())
      .filter((line) => line !== ''),
  ),
]

const createOrUpdatePullRequestForTask = async (
  taskDir: string,
  repository: string,
  octokit: Octokit,
  context: Context<WebhookEvent>,
) => {
  const workspace = await fs.mkdtemp(`${context.runnerTemp}/actions-tanpopo-`)
  core.info(`Created a workspace at ${workspace}`)
  await git.clone(repository, workspace, context)

  const precondition = await exec.exec('bash', [path.join(context.workspace, taskDir, 'precondition.sh')], {
    cwd: workspace,
    ignoreReturnCode: true,
  })
  if (precondition === 99) {
    core.info(`Skip the task by precondition.sh`)
    return
  }
  if (precondition !== 0) {
    throw new Error(`precondition failed with exit code ${precondition}`)
  }

  const response = await runCodingAgent(taskDir, workspace, context)
  const title = response.split('\n').at(0)
  const body = response.split('\n').slice(1).join('\n').trim()
  assert(title, 'The response must have a title')
  assert(body, 'The response must have a body')

  const gitStatus = await git.status(workspace)
  if (gitStatus === '') {
    return
  }

  const baseBranch = (await git.getDefaultBranch(workspace)) ?? 'main'
  const headBranch = `bot--${taskDir.replaceAll(/[^\w]/g, '-')}`
  const workflowRunUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`
  await exec.exec('git', ['add', '.'], { cwd: workspace })
  await exec.exec('git', ['config', 'user.name', context.actor], { cwd: workspace })
  await exec.exec('git', ['config', 'user.email', `${context.actor}@users.noreply.github.com`], { cwd: workspace })
  await exec.exec('git', ['commit', '--quiet', '-m', title, '-m', workflowRunUrl], { cwd: workspace })
  await exec.exec('git', ['rev-parse', 'HEAD'], { cwd: workspace })

  const [owner, repo] = repository.split('/')
  await pushSignedCommit(owner, repo, headBranch, octokit, workspace)
  const pull = await createOrUpdatePullRequest(octokit, {
    owner,
    repo,
    title,
    head: headBranch,
    base: baseBranch,
    body,
  })
  await octokit.rest.pulls.requestReviewers({
    owner,
    repo,
    pull_number: pull.number,
    reviewers: [context.actor],
  })
  core.info(`Requested review from ${context.actor} for pull request: ${pull.html_url}`)
  return pull
}

const pushSignedCommit = async (owner: string, repo: string, branch: string, octokit: Octokit, workspace: string) => {
  const tempBranch = `${branch}--signing`
  await exec.exec('git', ['push', '--quiet', '-f', 'origin', `HEAD:${tempBranch}`], { cwd: workspace })
  try {
    const { data: unsigned } = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch: tempBranch,
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
      ref: `heads/${tempBranch}`,
      sha: signedCommit.sha,
      force: true,
    })
    await exec.exec('git', ['fetch', '--quiet', 'origin', `${tempBranch}:${tempBranch}`], { cwd: workspace })
  } finally {
    await exec.exec('git', ['push', '--quiet', '--delete', 'origin', `${tempBranch}`], { cwd: workspace })
  }
  await exec.exec('git', ['push', '--quiet', '-f', 'origin', `${tempBranch}:${branch}`], { cwd: workspace })
}

type CreatePullRequest = NonNullable<Awaited<Parameters<Octokit['rest']['pulls']['create']>[0]>>

const createOrUpdatePullRequest = async (octokit: Octokit, pull: CreatePullRequest) => {
  const { data: existingPulls } = await octokit.pulls.list({
    owner: pull.owner,
    repo: pull.repo,
    state: 'open',
    head: `${pull.owner}:${pull.head}`,
    per_page: 1,
  })
  if (existingPulls.length > 0) {
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
    core.summary.addHeading('Updated the existing pull request', 3)
    core.summary.addRaw(`[#${existingPull.number}](${existingPull.html_url})`)
    return updatedPull
  }
  const { data: createdPull } = await octokit.pulls.create(pull)
  core.info(`Created pull request: ${createdPull.html_url}`)
  core.summary.addHeading('Created the pull request', 3)
  core.summary.addRaw(`[#${createdPull.number}](${createdPull.html_url})`)
  return createdPull
}
