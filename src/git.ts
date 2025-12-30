import * as core from '@actions/core'
import * as exec from '@actions/exec'
import type { WebhookEvent } from '@octokit/webhooks-types'
import type { Context } from './github.ts'

export const execWithCredentials = async (args: string[], options?: exec.ExecOptions) => {
  const credentials = Buffer.from(`x-access-token:${core.getInput('token')}`).toString('base64')
  core.setSecret(credentials)
  return await exec.exec('git', ['-c', `http.extraheader=AUTHORIZATION: basic ${credentials}`, ...args], options)
}

export const clone = async (repository: string, context: Context<WebhookEvent>, options?: exec.ExecOptions) => {
  await exec.exec('git', ['init', '--quiet', '.'], options)
  await exec.exec('git', ['remote', 'add', 'origin', `${context.serverUrl}/${repository}.git`], options)
  await execWithCredentials(['fetch', '--quiet', '--depth=1', 'origin'], options)
  await exec.exec('git', ['checkout', '--quiet', '--detach', 'origin/HEAD'], options)
}

export const status = async (options?: exec.ExecOptions): Promise<string> => {
  const { stdout } = await exec.getExecOutput('git', ['status', '--porcelain'], options)
  return stdout
}

export const getCommitSHA = async (refspec: string, options?: exec.ExecOptions): Promise<string> => {
  const { stdout } = await exec.getExecOutput('git', ['rev-parse', refspec], options)
  return stdout.trim()
}

export const getDefaultBranch = async (options?: exec.ExecOptions): Promise<string | undefined> => {
  const { stdout: defaultBranchRef } = await exec.getExecOutput(
    'git',
    ['rev-parse', '--symbolic-full-name', 'origin/HEAD'],
    options,
  )
  return defaultBranchRef.trim().split('/').pop()
}
