import * as fs from 'node:fs/promises'
import * as core from '@actions/core'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const readFileTool = createTool({
  id: 'readFile',
  description: 'Read a file.',
  inputSchema: z.object({
    path: z.string().describe('The path to the file in the repository.'),
  }),
  outputSchema: z.object({
    lines: z
      .array(
        z.object({
          address: z
            .number()
            .int()
            .min(0)
            .describe('The address of the line in the file. Address 0 is the first line.'),
          line: z
            .string()
            .describe('A line content at the address. This string does not include a trailing newline character.'),
        }),
      )
      .describe('The array of lines read from the file.'),
  }),
  execute: async ({ context }) => {
    const fileContent = await fs.readFile(context.path, 'utf-8')
    const lines = fileContent.split('\n').map((line, address) => ({ address, line }))
    core.startGroup(`🤖 Reading ${context.path} (${lines.length} lines)`)
    for (const { address, line } of lines) {
      core.info(`${address}: ${line}`)
    }
    core.endGroup()
    core.summary.addHeading(`🔧 Read a file (${lines.length} lines)`, 3)
    core.summary.addCodeBlock(context.path)
    return {
      lines,
    }
  },
})
