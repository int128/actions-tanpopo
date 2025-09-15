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
  switch (response.status) {
    case 'suspended':
      core.info('🤖: The task is suspended')
      break
    case 'success':
      core.info(`🤖: ${response.result.summary}`)
      break
    case 'failed':
      throw response.error
  }
}
