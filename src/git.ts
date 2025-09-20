import * as core from '@actions/core'
import * as exec from '@actions/exec'
import type { WebhookEvent } from '@octokit/webhooks-types'
import type { Context } from './github.js'

export const execWithCredentials = async (args: string[], options: exec.ExecOptions) => {
  const credentials = Buffer.from(`x-access-token:${core.getInput('token')}`).toString('base64')
  core.setSecret(credentials)
  return await exec.exec('git', ['--config', `http.extraheader=AUTHORIZATION: basic ${credentials}`, ...args], options)
}

export const clone = async (repository: string, workspace: string, context: Context<WebhookEvent>) => {
  await execWithCredentials(['clone', '--quiet', '--depth=1', `${context.serverUrl}/${repository}.git`, '.'], {
    cwd: workspace,
  })
  await exec.exec('git', ['config', 'unset', 'http.extraheader'], { cwd: workspace })
  await exec.exec('git', ['config', 'list'], { cwd: workspace })
}

export const status = async (workspace: string): Promise<string> => {
  const { stdout } = await exec.getExecOutput('git', ['status', '--porcelain'], { cwd: workspace })
  return stdout
}

export const getDefaultBranch = async (workspace: string): Promise<string | undefined> => {
  const { stdout: defaultBranchRef } = await exec.getExecOutput(
    'git',
    ['rev-parse', '--symbolic-full-name', 'origin/HEAD'],
    { cwd: workspace },
  )
  return defaultBranchRef.trim().split('/').pop()
}
