import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { Context } from './github.ts'

export type Task = {
  name: string
  repositories: string[]
  instruction: string
  preconditionScriptPath: string
}

export const parseTask = async (taskName: string, context: Context) => {
  const taskDir = path.join(context.workspace, 'tasks', taskName)
  const repositories = parseRepositoriesFile(await fs.readFile(path.join(taskDir, 'repositories'), 'utf-8'))
  const instruction = await fs.readFile(path.join(taskDir, 'README.md'), 'utf-8')
  return {
    name: taskName,
    repositories,
    instruction,
    preconditionScriptPath: path.join(taskDir, 'precondition.sh'),
  }
}

const parseRepositoriesFile = (s: string): string[] => [
  ...new Set(
    s
      .split('\n')
      .map((line) => line.replace(/#.*$/, '').trim())
      .filter((line) => line !== ''),
  ),
]
