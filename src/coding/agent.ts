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
  taskReadmePath: string
  githubContext: Context<WebhookEvent>
}

const codingAgent = new Agent({
  name: 'coding-agent',
  instructions: async ({ runtimeContext }) => {
    const typedRuntimeContext: RuntimeContext<CodingAgentRuntimeContext> = runtimeContext
    const githubContext = typedRuntimeContext.get('githubContext')
    return `
You are an agent for software development.
Follow the task to achieve the goal.
The current directory contains the target repository for your task.
You can create a file or directory under the temporary directory ${githubContext.runnerTemp}.
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

export const runCodingAgent = async (context: CodingAgentRuntimeContext) => {
  const instruction = `Follow the task described in the file ${context.taskReadmePath}.`
  core.info(instruction)
  core.summary.addRaw('<p>')
  core.summary.addRaw(instruction)
  core.summary.addRaw('</p>')

  const runtimeContext = new RuntimeContext<CodingAgentRuntimeContext>()
  runtimeContext.set('githubContext', context.githubContext)

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
  core.summary.addHeading(`🤖 Finish (${response.finishReason})`, 3)
  core.summary.addRaw('<p>\n\n')
  core.summary.addRaw(response.text)
  core.summary.addRaw('\n\n</p>')
  assert.equal(response.finishReason, 'stop')
}
