import assert from 'node:assert'
import * as fs from 'node:fs/promises'
import * as core from '@actions/core'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const editFileTool = createTool({
  id: 'editFile',
  description: 'Edit an existing file.',
  inputSchema: z.object({
    path: z.string().describe('The path to the file in the repository. The file must exist.'),
    patches: z
      .array(
        z.object({
          address: z
            .number()
            .int()
            .min(0)
            .describe(`The 0-based address of the line in the file. Address 0 is the first line.`),
          operation: z.enum(['REPLACE', 'DELETE']).describe(`The operation for the line:
- If REPLACE is set, replace the line content. If you want to insert a new line, replace an existing line with multiple lines separated by newline characters.
- If DELETE is set, mark the address for deletion.
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
  outputSchema: z.object({
    changes: z
      .array(
        z.object({
          address: z.number().int().min(0).describe('The address of the line in the file.'),
          original: z.string().optional().describe('The original content of the line.'),
          updated: z.string().optional().describe('The updated content of the line.'),
        }),
      )
      .describe('An array of changes made to the file.'),
  }),
  execute: async ({ context }) => {
    const originalContent = await fs.readFile(context.path, 'utf-8')
    const lines: (string | undefined)[] = originalContent.split('\n')
    const changes = []
    for (const patch of context.patches) {
      const { address } = patch
      assert(
        address >= 0 && address < lines.length,
        `address must be between 0 and ${lines.length - 1} but got ${address}`,
      )
      switch (patch.operation) {
        case 'REPLACE': {
          const original = lines[address]
          lines[address] = patch.replacement
          changes.push({ address, original, updated: patch.replacement })
          break
        }
        case 'DELETE': {
          changes.push({ address, original: lines[address], updated: undefined })
          lines[address] = undefined // Mark for deletion
          break
        }
      }
    }

    core.info(`🤖 Edited ${context.path} (${lines.length} lines)`)
    core.summary.addHeading(`🔧 Edit a file (${lines.length} lines)`, 3)
    core.summary.addCodeBlock(context.path)
    for (const change of changes) {
      core.info(`- ${change.address}: ${change.original ?? ''}`)
      core.info(`+ ${change.address}: ${change.updated ?? ''}`)
      core.summary.addCodeBlock(
        `\
- ${change.address}: ${change.original ?? ''}
+ ${change.address}: ${change.updated ?? ''}`,
        'diff',
      )
    }

    const newContent = lines.filter((line) => line !== undefined).join('\n')
    await fs.writeFile(context.path, newContent, 'utf-8')
    return { changes }
  },
})
