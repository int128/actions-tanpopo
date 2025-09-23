import * as fs from 'node:fs/promises'
import * as core from '@actions/core'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const readFileTool = createTool({
  id: 'readFile',
  description: `Read the lines from a file.`,
  inputSchema: z.object({
    path: z.string().describe('The path to the file in the repository.'),
    offset: z.int().min(0).describe('The 0-based address of the first line to read.'),
    limit: z.int().min(10).max(100).describe('The maximum number of lines to read.'),
  }),
  outputSchema: z.object({
    lines: z
      .array(
        z.object({
          address: z
            .int()
            .min(0)
            .describe('The address of the line in the file. Address 0 is the first line in the file.'),
          line: z
            .string()
            .describe('A line content at the address. This string does not include a trailing newline character.'),
        }),
      )
      .max(100)
      .describe('The array of lines read from the file. Up to 100 lines are returned.'),
    total: z.int().describe('The total number of lines in the file.'),
  }),
  execute: async ({ context }) => {
    const fileContent = await fs.readFile(context.path, 'utf-8')
    const allLines = fileContent.split('\n').map((line, address) => ({ address, line }))
    const partialLines = allLines.slice(context.offset, context.offset + context.limit)
    core.startGroup(`🤖 Reading ${context.path} (offset: ${context.offset}, limit: ${context.limit})`)
    for (const { address, line } of partialLines) {
      core.info(`${address}: ${line}`)
    }
    core.endGroup()
    core.summary.addHeading(`🔧 Read a file (offset: ${context.offset}, limit: ${context.limit})`, 3)
    core.summary.addCodeBlock(context.path)
    return {
      lines: partialLines,
      total: allLines.length,
    }
  },
})
