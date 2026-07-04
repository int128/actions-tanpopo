import * as core from '@actions/core'
import * as exec from '@actions/exec'

export type Context = {
  workspace: string
}

export const clone = async (context: Context, repoURL: string) => {
  await exec.exec('git', ['init', '--quiet', '.'], { cwd: context.workspace })
  await exec.exec('git', ['remote', 'add', 'origin', repoURL], {
    cwd: context.workspace,
  })
  await fetch(context)
  await exec.exec('git', ['checkout', '--quiet', '--detach', 'origin/HEAD'], { cwd: context.workspace })
}

export const fetch = async (context: Context, ...refspec: string[]) => {
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
      cwd: context.workspace,
      env: {
        ...(process.env as Record<string, string>),
        CONFIG_GIT_HTTP_EXTRAHEADER: authorizationHeader(),
      },
    },
  )
}

export const status = async (context: Context): Promise<string> => {
  const { stdout } = await exec.getExecOutput('git', ['status', '--porcelain'], { cwd: context.workspace })
  return stdout
}

export const getCommitSHA = async (context: Context, refspec: string): Promise<string> => {
  const { stdout } = await exec.getExecOutput('git', ['rev-parse', refspec], { cwd: context.workspace })
  return stdout.trim()
}

export const commit = async (context: Context, message: string, additionalMessages: string[]) => {
  await exec.exec('git', ['add', '.'], { cwd: context.workspace })
  await exec.exec(
    'git',
    ['commit', '--quiet', '-m', message, ...additionalMessages.flatMap((message) => ['-m', message])],
    {
      cwd: context.workspace,
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

export const push = async (context: Context, localRef: string, remoteRef: string) => {
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
      cwd: context.workspace,
      env: {
        ...(process.env as Record<string, string>),
        CONFIG_GIT_HTTP_EXTRAHEADER: authorizationHeader(),
      },
    },
  )
}

export const deleteRef = async (context: Context, ref: string) => {
  await exec.exec(
    'git',
    ['--config-env=http.extraheader=CONFIG_GIT_HTTP_EXTRAHEADER', 'push', '--quiet', '--delete', 'origin', ref],
    {
      cwd: context.workspace,
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
