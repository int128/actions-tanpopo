import * as core from '@actions/core'
import * as exec from '@actions/exec'
import type { Context } from './github.ts'

export const clone = async (repository: string, context: Context) => {
  await exec.exec('git', ['init', '--quiet', '.'])
  await exec.exec('git', ['remote', 'add', 'origin', `${context.serverUrl}/${repository}.git`])
  await fetch()
  await exec.exec('git', ['checkout', '--quiet', '--detach', 'origin/HEAD'])
}

export const fetch = async (...refspec: string[]) => {
  await exec.exec(
    'git',
    [
      '--config-env=http.extraheader=CONFIG_GIT_HTTP_EXTRAHEADER',
      'fetch',
      '--quiet',
      '--depth=1',
      '--no-tags',
      'origin',
      ...refspec,
    ],
    {
      env: {
        ...(process.env as Record<string, string>),
        CONFIG_GIT_HTTP_EXTRAHEADER: authorizationHeader(),
      },
    },
  )
}

export const status = async (): Promise<string> => {
  const { stdout } = await exec.getExecOutput('git', ['status', '--porcelain'])
  return stdout
}

export const getCommitSHA = async (refspec: string): Promise<string> => {
  const { stdout } = await exec.getExecOutput('git', ['rev-parse', refspec])
  return stdout.trim()
}

export const getDefaultBranch = async (): Promise<string | undefined> => {
  const { stdout } = await exec.getExecOutput('git', ['rev-parse', '--symbolic-full-name', 'origin/HEAD'])
  return stdout.trim().split('/').pop()
}

export const commit = async (message: string, additionalMessages: string[]) => {
  await exec.exec('git', ['add', '.'])
  await exec.exec(
    'git',
    ['commit', '--quiet', '-m', message, ...additionalMessages.flatMap((message) => ['-m', message])],
    {
      env: {
        ...(process.env as Record<string, string>),
        GIT_AUTHOR_NAME: 'github-actions',
        GIT_AUTHOR_EMAIL: 'actions@github.com',
        GIT_COMMITTER_NAME: 'github-actions',
        GIT_COMMITTER_EMAIL: 'actions@github.com',
      },
    },
  )
}

export const push = async (localRef: string, remoteRef: string) => {
  await exec.exec(
    'git',
    [
      '--config-env=http.extraheader=CONFIG_GIT_HTTP_EXTRAHEADER',
      'push',
      '--quiet',
      '--force',
      'origin',
      `${localRef}:${remoteRef}`,
    ],
    {
      env: {
        ...(process.env as Record<string, string>),
        CONFIG_GIT_HTTP_EXTRAHEADER: authorizationHeader(),
      },
    },
  )
}

export const deleteRef = async (ref: string) => {
  await exec.exec(
    'git',
    ['--config-env=http.extraheader=CONFIG_GIT_HTTP_EXTRAHEADER', 'push', '--quiet', '--delete', 'origin', ref],
    {
      env: {
        ...(process.env as Record<string, string>),
        CONFIG_GIT_HTTP_EXTRAHEADER: authorizationHeader(),
      },
    },
  )
}

const authorizationHeader = () => {
  const credentials = Buffer.from(`x-access-token:${core.getInput('token')}`).toString('base64')
  core.setSecret(credentials)
  return `AUTHORIZATION: basic ${credentials}`
}
