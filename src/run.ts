import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as core from '@actions/core'
import type { Octokit } from '@octokit/action'
import * as git from './git.ts'
import type { Context, Repository } from './github.ts'
import { openPullRequestWithWorkspaceChange } from './pull.ts'
import { parseTask, performTask, type Task, type Workspace } from './task.ts'

type Inputs = {
  tasks: string[]
}

export const run = async (inputs: Inputs, octokit: Octokit, context: Context) => {
  core.info(`Processing tasks: ${inputs.tasks.join(', ')}`)
  for (const taskName of inputs.tasks) {
    core.info(`== Task ${taskName}`)
    core.summary.addHeading(`Task ${taskName}`, 1)
    const taskDir = path.join(context.workspace, 'tasks', taskName)
    const task = await parseTask(taskDir)
    await processTask(task, octokit, context)
  }
}

const processTask = async (task: Task, octokit: Octokit, context: Context) => {
  let commentId: number | undefined
  const pulls = []
  for (const repository of task.repositories) {
    core.info(`=== ${repository.owner}/${repository.repo}`)
    core.summary.addHeading(`Repository ${repository.owner}/${repository.repo}`, 2)
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

const processRepository = async (repository: Repository, task: Task, octokit: Octokit, context: Context) => {
  const workspace: Workspace = {
    workspace: await fs.mkdtemp(`${context.runnerTemp}/workspace-`),
    repository,
  }
  await git.clone(workspace, `${context.serverUrl}/${repository.owner}/${repository.repo}.git`)
  const taskResponse = await performTask(task, workspace, context)
  if (taskResponse === null) {
    return
  }
  const pull = await openPullRequestWithWorkspaceChange(taskResponse, task, workspace, context, octokit)
  if (pull === undefined) {
    return
  }
  core.summary.addHeading('Pull request for the task', 3)
  core.summary.addLink(`${repository.owner}/${repository.repo}#${pull.number}`, pull.html_url)
  await core.summary.write()
  return pull
}
