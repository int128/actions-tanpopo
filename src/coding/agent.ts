import assert from 'node:assert'
import * as core from '@actions/core'
import { google } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import { RuntimeContext } from '@mastra/core/runtime-context'
import type { WebhookEvent } from '@octokit/webhooks-types'
import { wrapLanguageModel } from 'ai'
import z from 'zod'
import type { Context } from '../github.ts'
import { editFileTool } from './editFile.ts'
import { execTool } from './exec.ts'
import { readFileTool } from './readFile.ts'
import { retryMiddleware } from './retry.ts'
import { writeFileTool } from './writeFile.ts'

export type CodingAgentRuntimeContext = {
  taskInstruction: string
  githubContext: Context<WebhookEvent>
}

const codingAgent = new Agent({
  name: 'coding-agent',
  instructions: async ({ runtimeContext }) => {
    const typedRuntimeContext: RuntimeContext<CodingAgentRuntimeContext> = runtimeContext
    const githubContext = typedRuntimeContext.get('githubContext')
    return `
You are an agent for software development.
Follow the given task.
The current directory contains the workspace for your task.

You can create a file or directory under the temporary directory ${githubContext.runnerTemp}.
To read a file, prefer readFile tool instead of exec tool with cat command.
To write a file, prefer writeFile or editFile tool instead of exec tool with redirection.
`
  },
  model: wrapLanguageModel({
    model: google('gemini-3-flash-preview'),
    middleware: [retryMiddleware],
  }),
  tools: {
    readFileTool,
    writeFileTool,
    editFileTool,
    execTool,
  },
})

export const runCodingAgent = async (context: CodingAgentRuntimeContext) => {
  core.info(context.taskInstruction)
  core.summary.addRaw('<p>')
  core.summary.addRaw(context.taskInstruction)
  core.summary.addRaw('</p>')

  const runtimeContext = new RuntimeContext<CodingAgentRuntimeContext>()
  runtimeContext.set('githubContext', context.githubContext)

  const response = await codingAgent.generate(['Follow the task:', context.taskInstruction], {
    maxSteps: 30,
    runtimeContext,
    structuredOutput: {
      schema: z.object({
        title: z.string().describe('The title of pull request for this task.'),
        body: z.string().describe(`The body of pull request for this task.
For example:
\`\`\`
## Purpose
X is deprecated and no longer maintained.
## Changes
- Replace X with Y
\`\`\`
`),
      }),
    },
    onStepFinish: (event: unknown) => {
      if (typeof event === 'object' && event !== null) {
        if ('stepType' in event && typeof event.stepType === 'string') {
          core.info(`🤖: ${event.stepType}`)
          core.summary.addHeading(`🤖 ${event.stepType}`, 3)
        }
        if ('text' in event && typeof event.text === 'string' && event.text) {
          core.info(`🤖: ${event.text}`)
          core.summary.addRaw('<p>\n\n')
          core.summary.addRaw(event.text)
          core.summary.addRaw('\n\n</p>')
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
  return response.object
}
