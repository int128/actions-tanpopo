import assert from 'node:assert'
import * as path from 'node:path'
import * as core from '@actions/core'
import { google } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import type { WebhookEvent } from '@octokit/webhooks-types'
import { wrapLanguageModel } from 'ai'
import type { Context } from '../github.js'
import { createFileTool } from './createFile.js'
import { editFileTool } from './editFile.js'
import { execTool } from './exec.js'
import { readFileTool } from './readFile.js'
import { retryMiddleware } from './retry.js'

const codingAgent = new Agent({
  name: 'coding-agent',
  instructions: `
You are an agent for software development.
You are running in GitHub Actions environment.
Follow the task to achieve the goal.

Finally, return the title and body of the pull request to create.
The first line of the response is the title, and the rest is the body.
For example:
\`\`\`
Migrate from X to Y

## Purpose
X is deprecated and no longer maintained.

## Changes
- Replace X with Y
\`\`\`
`,
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
  const instruction = `\
Follow the task described in ${path.resolve(taskDir, 'README.md')}.
The code base is checked out into the directory ${workspace}.
If you need to create a temporary file, create it under ${context.runnerTemp}.
`.trim()
  core.info(instruction)
  core.summary.addRaw('<p>')
  core.summary.addRaw(instruction)
  core.summary.addRaw('</p>')

  const response = await codingAgent.generateVNext(instruction, {
    maxSteps: 30,
    onStepFinish: (event: unknown) => {
      if (
        typeof event === 'object' &&
        event !== null &&
        'text' in event &&
        typeof event.text === 'string' &&
        event.text
      ) {
        core.info(`🤖: ${event.text}`)
      } else {
        core.info(`🤖: ${JSON.stringify(event)}`)
      }
    },
  })
  core.info(`🤖: ${response.finishReason}: ${response.text}`)
  core.summary.addHeading(`🤖 Finished (${response.finishReason})`, 3)
  core.summary.addRaw('<p>\n\n')
  core.summary.addRaw(response.text)
  core.summary.addRaw('\n\n</p>')

  assert.equal(response.finishReason, 'stop')
  return response.text
}
