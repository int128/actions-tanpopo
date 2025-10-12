import assert from 'node:assert'
import * as fs from 'node:fs/promises'
import { Octokit } from '@octokit/action'
import { retry } from '@octokit/plugin-retry'
import type { WebhookEvent } from '@octokit/webhooks-types'

export const getOctokit = () => new (Octokit.plugin(retry))()

export type Context<E extends WebhookEvent> = {
  repo: {
    owner: string
    repo: string
  }
  eventName: string
  actor: string
  runId: number
  runnerTemp: string
  serverUrl: string
  workspace: string
  payload: E
}

export const getContext = async (): Promise<Context<WebhookEvent>> => {
  // https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables
  return {
    repo: getRepo(),
    eventName: getEnv('GITHUB_EVENT_NAME'),
    actor: getEnv('GITHUB_ACTOR'),
    runId: Number(getEnv('GITHUB_RUN_ID')),
    runnerTemp: getEnv('RUNNER_TEMP'),
    serverUrl: getEnv('GITHUB_SERVER_URL'),
    workspace: getEnv('GITHUB_WORKSPACE'),
    payload: JSON.parse(await fs.readFile(getEnv('GITHUB_EVENT_PATH'), 'utf-8')) as WebhookEvent,
  }
}

const getRepo = () => {
  const [owner, repo] = getEnv('GITHUB_REPOSITORY').split('/')
  return { owner, repo }
}

const getEnv = (name: string): string => {
  assert(process.env[name], `${name} is required`)
  return process.env[name]
}
