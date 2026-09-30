import assert from 'node:assert'
import * as core from '@actions/core'
import { Agent } from '@mastra/core/agent'
import { StreamErrorRetryProcessor } from '@mastra/core/processors'
import { LocalFilesystem, LocalSandbox, Workspace } from '@mastra/core/workspace'
import z from 'zod'
import type { Context } from '../github.ts'
import type { Workspace as WorkspaceContext } from '../task.ts'
import { TokenProvider } from './provider.ts'

export class CodingAgent {
  readonly agent
  private readonly tokenProvider = new TokenProvider()

  constructor(githubContext: Context, workspaceContext: WorkspaceContext) {
    this.agent = new Agent({
      id: 'coding-agent',
      name: 'coding-agent',
      instructions: `
You are an agent for software development.
Follow the given task.
The current directory contains the workspace for your task.
You can create a file or directory under the temporary directory ${githubContext.runnerTemp}.
`,
      model: async () => ({
        id: 'openai/gpt-6-luna',
        apiKey: await this.tokenProvider.get(),
      }),
      errorProcessors: [new StreamErrorRetryProcessor()],
      workspace: new Workspace({
        filesystem: new LocalFilesystem({
          basePath: workspaceContext.workspace,
          allowedPaths: [githubContext.runnerTemp],
        }),
        sandbox: new LocalSandbox({
          workingDirectory: workspaceContext.workspace,
          env: {
            HOME: process.env['HOME'],
          },
        }),
      }),
    })
  }

  async run(taskInstruction: string) {
    core.info(taskInstruction)
    core.summary.addQuote(taskInstruction)

    const response = await this.agent.generate(['Follow the task:', taskInstruction], {
      maxSteps: 30,
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
        if (event.text) {
          core.info(`🤖: ${event.stepType ?? ''}: ${event.text}`)
          core.summary.addHeading(`🤖 Step: ${event.stepType ?? ''}`, 3)
          core.summary.addCodeBlock(event.text)
        }
        if (event.toolResults.length > 0) {
          for (const toolResult of event.toolResults) {
            core.startGroup(`🤖 Tool: ${toolResult.payload.toolName}`)
            core.info(JSON.stringify(toolResult.payload.args, null, 2))
            core.info(String(toolResult.payload.result))
            core.endGroup()
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
}
