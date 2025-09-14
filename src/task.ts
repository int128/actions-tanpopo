import * as core from '@actions/core'
import * as path from 'path'
import { Context } from './github.js'
import { WebhookEvent } from '@octokit/webhooks-types'
import { google } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'

const systemInstruction = `
You are an agent for software development.
You are running in GitHub Actions environment.
Follow the task to achieve the goal.
`

export const applyTask = async (taskDir: string, workspace: string, context: Context<WebhookEvent>) => {
  const codingAgent = new Agent({
    name: 'coding-agent',
    instructions: systemInstruction,
    model: google('gemini-2.5-flash'),
  })

  const response = await codingAgent.stream(`\
Follow the task described in ${path.join(taskDir, 'README.md')}.
The code base is checked out into the directory ${workspace}.
If you need to create a temporary file, create it under ${context.runnerTemp}.
`)
  for await (const chunk of response.textStream) {
    core.info(chunk)
  }
}
