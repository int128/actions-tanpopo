import assert from 'node:assert'
import * as core from '@actions/core'
import { google } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import { RequestContext } from '@mastra/core/request-context'
import { LocalFilesystem, LocalSandbox, Workspace } from '@mastra/core/workspace'
import { wrapLanguageModel } from 'ai'
import z from 'zod'
import type { Context } from '../github.ts'
import type { Workspace as WorkspaceContext } from '../task.ts'
import { retryMiddleware } from './retry.ts'

export type CodingAgentRequestContext = {
  taskInstruction: string
  workspaceContext: WorkspaceContext
  githubContext: Context
}

const codingAgent = new Agent({
  id: 'coding-agent',
  name: 'coding-agent',
  instructions: ({ requestContext }) => {
    const githubContext: Context = requestContext.get('githubContext')
    return `
You are an agent for software development.
Follow the given task.
The current directory contains the workspace for your task.
You can create a file or directory under the temporary directory ${githubContext.runnerTemp}.
`
  },
  model: wrapLanguageModel({
    model: google('gemini-3.5-flash'),
    middleware: [retryMiddleware],
  }),
  workspace: new Workspace({
    filesystem: ({ requestContext }) => {
      const githubContext: Context = requestContext.get('githubContext')
      const workspaceContext: WorkspaceContext = requestContext.get('workspaceContext')
      return new LocalFilesystem({
        basePath: workspaceContext.workspace,
        allowedPaths: [githubContext.runnerTemp],
      })
    },
    sandbox: ({ requestContext }) => {
      const workspaceContext: WorkspaceContext = requestContext.get('workspaceContext')
      return new LocalSandbox({
        workingDirectory: workspaceContext.workspace,
      })
    },
  }),
})

export const runCodingAgent = async (context: CodingAgentRequestContext) => {
  core.info(context.taskInstruction)
  core.summary.addQuote(context.taskInstruction)

  const requestContext = new RequestContext()
  requestContext.set('githubContext', context.githubContext)
  requestContext.set('workspaceContext', context.workspaceContext)

  const response = await codingAgent.generate(['Follow the task:', context.taskInstruction], {
    maxSteps: 30,
    requestContext,
    structuredOutput: {
      schema: z
        .object({
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
        .describe('A pull request will be created after finishing the task.'),
    },
    onStepFinish: (event) => {
      core.info(`🤖: ${event.stepType ?? ''}: ${event.text}`)
      if (event.text) {
        core.summary.addHeading(`🤖 Step: ${event.stepType ?? ''}`, 3)
        core.summary.addCodeBlock(event.text)
      }
      if (event.toolResults.length > 0) {
        for (const toolResult of event.toolResults) {
          core.summary.addHeading(`🤖 Tool: ${toolResult.payload.toolName}`, 3)
          core.summary.addCodeBlock(JSON.stringify(toolResult.payload.args, null, 2), 'json')
          core.summary.addCodeBlock(String(toolResult.payload.result))
        }
      }
    },
  })
  core.info(`🤖: ${response.finishReason}: ${response.text}`)
  core.summary.addHeading(`🤖 Finish (${response.finishReason})`, 3)
  core.summary.addCodeBlock(response.text, 'json')
  assert.equal(response.finishReason, 'stop')
  return response.object
}
