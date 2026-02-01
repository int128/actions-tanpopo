import * as fs from 'node:fs/promises'
import * as core from '@actions/core'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const readFileTool = createTool({
  id: 'readFile',
  description: `Read the lines from a file.`,
  inputSchema: z.object({
    path: z.string().describe('The path relative to the workspace. This can be an absolute path.'),
    offset: z
      .int()
      .min(0)
      .describe(`The 0-based address of the first line to read.
For example, if you want to read from the beginning of the file, set this to 0.
If you want to read from the 101st line, set this to 100.
`),
  }),
  outputSchema: z.object({
    totalLines: z.int().describe(`The total number of lines in the file.`),
    nextOffset: z
      .int()
      .optional()
      .describe(`The 0-based address of the next line to read.
If there are more lines to read, this field is set to the address of the next line.
If all lines have been read, this field is omitted.
`),
    readLines: z
      .array(
        z.object({
          address: z
            .int()
            .min(0)
            .describe('0-based address of the line in the file. Address 0 is the first line in the file.'),
          line: z
            .string()
            .describe('A line content at the address. This string does not include a trailing newline character.'),
        }),
      )
      .max(100)
      .describe('The array of lines read from the file. Up to 100 lines are returned.'),
  }),
  execute: async (inputData) => {
    const fileContent = await fs.readFile(inputData.path, 'utf-8')
    const allLines = fileContent.split('\n').map((line, address) => ({ address, line }))
    const readLines = allLines.slice(inputData.offset, inputData.offset + 100)
    const nextOffset =
      inputData.offset + readLines.length < allLines.length ? inputData.offset + readLines.length : undefined
    core.startGroup(`🤖 Reading ${inputData.path} (offset: ${inputData.offset})`)
    for (const { address, line } of readLines) {
      core.info(`${address}: ${line}`)
    }
    core.endGroup()
    core.summary.addHeading(`🔧 Read ${inputData.path}`, 3)
    core.summary.addList([
      `offset=${inputData.offset}`,
      `readLines=${readLines.length}`,
      `nextOffset=${nextOffset}`,
      `totalLines=${allLines.length}`,
    ])
    return {
      totalLines: allLines.length,
      readLines,
      nextOffset,
    }
  },
})
