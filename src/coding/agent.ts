import assert from 'node:assert'
import * as core from '@actions/core'
import { google } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import { RequestContext } from '@mastra/core/request-context'
import { wrapLanguageModel } from 'ai'
import z from 'zod'
import type { Context } from '../github.ts'
import { editFileTool } from './editFile.ts'
import { execTool } from './exec.ts'
import { grepTool } from './grep.ts'
import { lsTool } from './ls.ts'
import { readFileTool } from './readFile.ts'
import { retryMiddleware } from './retry.ts'
import { writeFileTool } from './writeFile.ts'
import { loggerMiddleware } from './logger.ts'

export type CodingAgentRequestContext = {
  taskInstruction: string
  githubContext: Context
}

const codingAgent = new Agent({
  id: 'coding-agent',
  name: 'coding-agent',
  instructions: async ({ requestContext }) => {
    const githubContext: Context = requestContext.get('githubContext')
    return `
You are an agent for software development.
Follow the given task.

The current directory contains the workspace for your task.
You can create a file or directory under the temporary directory ${githubContext.runnerTemp}.
To find a file, prefer ls tool instead of a command.
To grep a pattern, prefer grep tool instead of a command.
To read a file, prefer readFile tool instead of exec tool with cat command.
To write a file, prefer writeFile or editFile tool instead of exec tool with redirection.
`
  },
  model: wrapLanguageModel({
    model: google('gemini-3-flash-preview'),
    middleware: [retryMiddleware, loggerMiddleware],
  }),
  tools: {
    lsTool,
    grepTool,
    readFileTool,
    writeFileTool,
    editFileTool,
    execTool,
  },
})

const CodingAgentResponse = z.discriminatedUnion('conclusion', [
  z
    .object({
      conclusion: z.literal('success').describe('The conclusion of the task.'),
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
    })
    .describe('If successful, return this object. A pull request will be created.'),
  z
    .object({
      conclusion: z.literal('failure').describe('The conclusion of the task.'),
      reason: z.string().describe('The reason of failure.'),
    })
    .describe('If failed, return this object.'),
])

export type CodingAgentResponse = z.infer<typeof CodingAgentResponse>

export const runCodingAgent = async (context: CodingAgentRequestContext): Promise<CodingAgentResponse> => {
  core.info(context.taskInstruction)
  core.summary.addQuote(context.taskInstruction)

  const requestContext = new RequestContext()
  requestContext.set('githubContext', context.githubContext)

  const response = await codingAgent.generate(['Follow the task:', context.taskInstruction], {
    maxSteps: 20,
    requestContext,
    structuredOutput: {
      schema: CodingAgentResponse,
    },
  })
  core.info(`🤖: ${response.finishReason}: ${response.text}`)
  core.summary.addHeading(`🤖 Finish (${response.finishReason})`, 3)
  core.summary.addCodeBlock(response.text, 'json')
  assert.equal(response.finishReason, 'stop')
  return response.object
}
