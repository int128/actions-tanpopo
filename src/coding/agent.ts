import assert from 'node:assert'
import * as path from 'node:path'
import * as core from '@actions/core'
import { google } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import { RuntimeContext } from '@mastra/core/runtime-context'
import type { WebhookEvent } from '@octokit/webhooks-types'
import { wrapLanguageModel } from 'ai'
import type { Context } from '../github.js'
import { createFileTool } from './createFile.js'
import { editFileTool } from './editFile.js'
import { execTool } from './exec.js'
import { readFileTool } from './readFile.js'
import { retryMiddleware } from './retry.js'

export type CodingAgentRuntimeContext = {
  workspace: string
  github: Context<WebhookEvent>
}

const codingAgent = new Agent({
  name: 'coding-agent',
  instructions: async ({ runtimeContext }) => {
    const typedRuntimeContext: RuntimeContext<CodingAgentRuntimeContext> = runtimeContext
    return `
You are an agent for software development.
Follow the task to achieve the goal.
Perform the task in the workspace directory ${typedRuntimeContext.get('workspace')}.
The workspace directory contains the target repository for your task.
You can create a file or directory under the temporary directory ${typedRuntimeContext.get('github').runnerTemp}.
`
  },
  model: wrapLanguageModel({
    model: google('gemini-2.5-flash'),
    middleware: [retryMiddleware],
  }),
  tools: {
    execTool,
    createFileTool,
    readFileTool,
    editFileTool,
  },
})

export const runCodingAgent = async (taskDir: string, workspace: string, context: Context<WebhookEvent>) => {
  const instruction = `Follow the task described in the file ${path.resolve(taskDir, 'README.md')}.`
  core.info(instruction)
  core.summary.addRaw('<p>')
  core.summary.addRaw(instruction)
  core.summary.addRaw('</p>')

  const runtimeContext = new RuntimeContext<CodingAgentRuntimeContext>()
  runtimeContext.set('workspace', workspace)
  runtimeContext.set('github', context)

  const response = await codingAgent.generateVNext(instruction, {
    maxSteps: 30,
    runtimeContext,
    onStepFinish: (event: unknown) => {
      if (typeof event === 'object' && event !== null) {
        if ('text' in event && typeof event.text === 'string' && event.text) {
          core.info(`🤖: ${event.text}`)
        } else if ('stepType' in event && typeof event.stepType === 'string') {
          core.info(`🤖: ${event.stepType}`)
        }
      }
    },
  })
  core.info(`🤖: ${response.finishReason}: ${response.text}`)
  core.summary.addHeading(`🤖 Finished (${response.finishReason})`, 3)
  core.summary.addRaw('<p>\n\n')
  core.summary.addRaw(response.text)
  core.summary.addRaw('\n\n</p>')
  assert.equal(response.finishReason, 'stop')
}
