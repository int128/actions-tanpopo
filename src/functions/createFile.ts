import * as core from '@actions/core'
import * as fs from 'fs/promises'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const createFileTool = createTool({
  id: 'createFile',
  description: 'Create a new file.',
  inputSchema: z.object({
    path: z.string().describe('The absolute path to the new file'),
    content: z.string().describe('The content of the new file'),
  }),
  outputSchema: z.object({
    path: z.string().describe('The absolute path to the new file'),
  }),
  execute: async ({ context }) => {
    await fs.writeFile(context.path, context.content)
    core.startGroup(`🤖 Created a new file at ${context.path}`)
    core.info(context.content)
    core.endGroup()
    core.summary.addHeading(`🤖 Created a new file at ${context.path}`, 3)
    core.summary.addCodeBlock(context.content)
    return {
      path: context.path,
    }
  },
})
