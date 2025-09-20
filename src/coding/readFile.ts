import * as fs from 'node:fs/promises'
import * as core from '@actions/core'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const readFileTool = createTool({
  id: 'readFile',
  description: 'Read a file in the workspace.',
  inputSchema: z.object({
    path: z.string().describe('The absolute path to the file. The file must already exist.'),
  }),
  outputSchema: z.object({
    lines: z
      .array(
        z.object({
          row: z
            .number()
            .int()
            .min(1)
            .describe('The 1-based index of the line in the file. For example, the first line is 1.'),
          line: z
            .string()
            .describe('A line read from the file. This string does not include a trailing newline character.'),
        }),
      )
      .describe('The array of lines read from the file.'),
  }),
  execute: async ({ context }) => {
    const content = await fs.readFile(context.path, 'utf-8')
    const lines = content.split('\n').map((line, index) => ({ row: index + 1, line }))
    core.startGroup(`🤖 Reading ${context.path} (${lines.length} lines)`)
    for (const { row, line } of lines) {
      core.info(`${row}: ${line}`)
    }
    core.endGroup()
    core.summary.addHeading(`🔧 Read a file (${lines.length} lines)`, 3)
    core.summary.addCodeBlock(context.path)
    return {
      lines,
    }
  },
})
