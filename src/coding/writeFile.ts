import * as fs from 'node:fs/promises'
import * as core from '@actions/core'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const writeFileTool = createTool({
  id: 'writeFile',
  description: 'Write the content to a file. If the file already exists, it will be overwritten.',
  inputSchema: z.object({
    path: z.string().describe('The path relative to the workspace. This can be an absolute path.'),
    content: z.string().describe('The content to write.'),
  }),
  outputSchema: z.object({
    ok: z.boolean().describe('Whether the file was written successfully'),
  }),
  execute: async (inputData) => {
    await fs.writeFile(inputData.path, inputData.content)
    core.startGroup(`🤖 Wrote ${inputData.path}`)
    core.info(inputData.content)
    core.endGroup()
    core.summary.addHeading(`🔧 Write ${inputData.path}`, 3)
    core.summary.addCodeBlock(inputData.content)
    return {
      ok: true,
    }
  },
})
