import assert from 'node:assert'
import * as fs from 'node:fs/promises'
import * as core from '@actions/core'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const editFileTool = createTool({
  id: 'editFile',
  description: 'Update an existing file.',
  inputSchema: z.object({
    path: z.string().describe('The absolute path to the file to be edited. The file must already exist.'),
    patches: z
      .array(
        z.object({
          row: z
            .number()
            .int()
            .min(1)
            .describe(`The 1-based index of the line.
For example, the first line is row 1, the second line is row 2, etc.
`),
          operation: z.enum(['REPLACE', 'INSERT_BEFORE', 'DELETE']).describe(`The operation to perform on the line.
Valid operations are:
- REPLACE: Replace the line with the "replacement" text.
- INSERT_BEFORE: Insert the "insertion" text before the line.
  The row index will not change after this operation.
- DELETE: Mark the line for deletion.
  The line will be removed after all patches are applied.
  The row index of subsequent lines will not change after this operation.
`),
          replacement: z
            .string()
            .optional()
            .describe('The text to replace the line with. Required for REPLACE operation.'),
          insertion: z
            .string()
            .optional()
            .describe('The text to insert before the line. Required for INSERT_BEFORE operation.'),
        }),
      )
      .min(1)
      .describe(`An array of patches to perform on the file.
The patches will be applied in the order they are specified.
`),
  }),
  outputSchema: z.object({}),
  execute: async ({ context }) => {
    const originalContent = await fs.readFile(context.path, 'utf-8')
    const lines: (string | undefined)[] = originalContent.split('\n')

    core.info(`🤖 Editing ${context.path} (${lines.length} lines)`)
    core.startGroup(`Patches`)
    core.info(JSON.stringify(context.patches, null, 2))
    core.endGroup()
    for (const patch of context.patches) {
      switch (patch.operation) {
        case 'REPLACE': {
          const { row, replacement } = patch
          assert(row >= 1 && row <= lines.length, `row must be between 1 and ${lines.length} but got ${row}`)
          core.info(`${row}: - ${lines[row - 1]}`)
          lines[row - 1] = replacement
          core.info(`${row}: + ${replacement}`)
          break
        }
        case 'INSERT_BEFORE': {
          const { row, insertion } = patch
          assert(row >= 1 && row <= lines.length + 1, `row must be between 1 and ${lines.length + 1} but got ${row}`)
          core.info(`${row}: + ${insertion}`)
          core.info(`${row}:   ${lines[row - 1]}`)
          lines[row - 1] = [insertion, lines[row - 1]].join('\n')
          break
        }
        case 'DELETE': {
          const { row } = patch
          assert(row >= 1 && row <= lines.length, `row must be between 1 and ${lines.length} but got ${row}`)
          core.info(`${row}: - ${lines[row - 1]}`)
          lines[row - 1] = undefined // Mark for deletion
          break
        }
      }
    }

    const newContent = lines.filter((line) => line !== undefined).join('\n')
    await fs.writeFile(context.path, newContent, 'utf-8')
    core.summary.addHeading(`🤖 Edited ${context.path}`, 3)
    core.summary.addCodeBlock(JSON.stringify(context.patches, null, 2), 'json')
    return {}
  },
})
