import * as fs from 'node:fs/promises'
import * as core from '@actions/core'
import type { Octokit } from '@octokit/action'
import * as git from './git.ts'
import type { Context } from './github.ts'
import { openPullRequestWithWorkspaceChange } from './pull.ts'
import { parseTask, performTask, type Task } from './task.ts'

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

  core.summary.addHeading(`Repository ${repository}`, 2)
  const taskResponse = await performTask(task, context)
  if (taskResponse === null) {
    return
  }

  const pull = await openPullRequestWithWorkspaceChange(
    {
      taskName: task.name,
      repository,
      title: taskResponse.title,
      body: taskResponse.body,
      enablePullRequestAutoMerge: task.metadata.enablePullRequestAutoMerge ?? false,
    },
    context,
    octokit,
  )
  if (pull === undefined) {
    return
  }
  core.summary.addHeading('Pull request for the task', 3)
  core.summary.addLink(`${repository}#${pull.number}`, pull.html_url)
  await core.summary.write()
  return pull
}
