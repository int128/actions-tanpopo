import * as core from '@actions/core'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const reportTool = createTool({
  id: 'report',
  description: 'Report the reasoning.',
  inputSchema: z.object({
    message: z.string().describe('The message to report.'),
  }),
  outputSchema: z.object({}),
  execute: async (inputData) => {
    core.info(`🤖: ${inputData.message}`)
    core.summary.addHeading(`🤖 Reasoning`, 3)
    core.summary.addRaw(inputData.message)
    return {}
  },
})
