import * as core from '@actions/core'
import * as path from 'path'
import { Context } from './github.js'
import { WebhookEvent } from '@octokit/webhooks-types'
import { codingWorkflow } from './workflows/coding.js'

export const applyTask = async (taskDir: string, workspace: string, context: Context<WebhookEvent>) => {
  const run = await codingWorkflow.createRunAsync()
  const response = await run.start({
    inputData: {
      taskDescriptionPath: path.resolve(taskDir, 'README.md'),
      workspacePath: workspace,
      temporaryPath: context.runnerTemp,
    },
  })
  core.info(`🤖: ${JSON.stringify(response)}`)
  if (response.status === 'failed') {
    throw response.error
  }
}
