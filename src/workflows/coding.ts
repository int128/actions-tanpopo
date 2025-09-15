import { createStep, Workflow } from '@mastra/core'
import { Agent } from '@mastra/core/agent'
import { wrapLanguageModel } from 'ai'
import { google } from '@ai-sdk/google'
import { retryMiddleware } from './retry.js'
import { execTool } from '../functions/exec.js'
import { createFileTool } from '../functions/createFile.js'
import { readFileTool } from '../functions/readFile.js'
import { editFileTool } from '../functions/editFile.js'
import { z } from 'zod'

const codingAgent = new Agent({
  name: 'coding-agent',
  instructions: `
You are an agent for software development.
You are running in GitHub Actions environment.
Follow the task to achieve the goal.
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

const codingStep = createStep({
  id: 'coding-workflow',
  inputSchema: z.object({
    taskDescriptionPath: z.string().describe('The absolute path to the task description file'),
    workspacePath: z
      .string()
      .describe('The absolute path to the workspace directory where the code base is checked out'),
    temporaryPath: z.string().describe('The absolute path to the temporary directory for creating temporary files'),
  }),
  outputSchema: z.object({
    summary: z.string().describe('The summary of the work done by the agent'),
  }),
  execute: async ({ inputData: { taskDescriptionPath, workspacePath, temporaryPath } }) => {
    const response = await codingAgent.generate(`
Follow the task described in ${taskDescriptionPath}.
The code base is checked out into the directory ${workspacePath}.
If you need to create a temporary file, create it under ${temporaryPath}.
Finally, summarize what you have done and what is left in a brief manner.
`)
    return { summary: response.text }
  },
})

export const codingWorkflow = new Workflow({
  id: 'coding-workflow',
  inputSchema: z.object({
    taskDescriptionPath: z.string().describe('The absolute path to the task description file'),
    workspacePath: z
      .string()
      .describe('The absolute path to the workspace directory where the code base is checked out'),
    temporaryPath: z.string().describe('The absolute path to the temporary directory for creating temporary files'),
  }),
  outputSchema: z.object({
    summary: z.string().describe('The summary of the work done by the agent'),
  }),
  steps: [codingStep],
})
