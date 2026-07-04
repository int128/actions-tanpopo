import assert from 'node:assert'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { z } from 'zod'
import { runCodingAgent } from './coding/agent.ts'
import type { Context, Repository } from './github.ts'

export type Workspace = {
  workspace: string
  repository: Repository
}

export type Task = {
  name: string
  metadata: TaskMetadata
  repositories: Repository[]
  instruction: string
  preconditionScriptPath: string
}

const TaskMetadata = z.object({
  enablePullRequestAutoMerge: z.boolean().optional(),
})

export type TaskMetadata = z.infer<typeof TaskMetadata>

export const parseTask = async (taskDir: string): Promise<Task> => {
  const repositories = parseRepositoriesFile(await fs.readFile(path.join(taskDir, 'repositories'), 'utf-8'))
  const instruction = await fs.readFile(path.join(taskDir, 'README.md'), 'utf-8')
  const metadata = TaskMetadata.parse(JSON.parse(await fs.readFile(path.join(taskDir, 'task.json'), 'utf-8')))
  return {
    name: path.basename(taskDir),
    repositories,
    instruction,
    metadata,
    preconditionScriptPath: path.join(taskDir, 'precondition.sh'),
  }
}

const parseRepositoriesFile = (s: string): Repository[] =>
  [
    ...new Set(
      s
        .split('\n')
        .map((line) => line.replace(/#.*$/, '').trim())
        .filter((line) => line !== ''),
    ),
  ].map((line) => {
    const [owner, repo] = line.split('/', 2)
    assert(owner, 'repository must have an owner part')
    assert(repo, 'repository must have a repo part')
    return { owner, repo }
  })

export const performTask = async (task: Task, workspace: Workspace, githubContext: Context) => {
  const preconditionCode = await exec.exec('bash', [task.preconditionScriptPath], {
    cwd: workspace.workspace,
    ignoreReturnCode: true,
  })
  if (preconditionCode === 99) {
    core.info(`Skip the task by precondition.sh with exit code ${preconditionCode}`)
    return null
  }
  if (preconditionCode === 109) {
    core.info(`Skip the coding agent by precondition.sh with exit code ${preconditionCode}`)
    const instructionLines = task.instruction.split('\n')
    return {
      title:
        instructionLines
          .find((line) => line.startsWith('#'))
          ?.replace(/^#/, '')
          .trim() || 'Untitled',
      body: instructionLines
        .filter((line) => !line.startsWith('#'))
        .join('\n')
        .trim(),
    }
  }
  if (preconditionCode !== 0) {
    throw new Error(`precondition.sh failed with exit code ${preconditionCode}`)
  }

  return await runCodingAgent({
    taskInstruction: task.instruction,
    workspace,
    githubContext,
  })
}
