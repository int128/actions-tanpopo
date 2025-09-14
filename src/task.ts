import * as core from '@actions/core'
import * as path from 'path'
import { Context } from './github.js'
import { WebhookEvent } from '@octokit/webhooks-types'
import { google } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import { execTool } from './functions/exec.js'
import { createFileTool } from './functions/createFile.js'
import { readFileTool } from './functions/readFile.js'
import { editFileTool } from './functions/editFile.js'

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
    tools: {
      execTool,
      createFileTool,
      readFileTool,
      editFileTool,
    },
  })

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
    maxSteps: 20,
    onStepFinish: (step: unknown) => {
      if (typeof step === 'object' && step !== null && 'text' in step && typeof step.text === 'string' && step.text) {
        core.info(`🤖: ${step.text}`)
      }
    },
  })
  core.info(`🤖: ${response.finishReason}: ${response.text}`)
  core.summary.addHeading(`🤖: ${response.finishReason}`, 3)
  core.summary.addRaw('<p>')
  core.summary.addRaw(response.text)
  core.summary.addRaw('</p>')
}
