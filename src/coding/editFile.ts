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
          operation: z.enum(['REPLACE', 'INSERT_BEFORE', 'DELETE']).describe(`The operation for the line:
- If REPLACE is set, change the line content.
- If INSERT_BEFORE is set, insert the new line before the address. The all addresses will be kept after the insertion.
- If DELETE is set, mark the line for deletion. The all addresses will be kept after the deletion.
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

    core.info(`🤖 Editing ${context.path} (${lines.length} lines)`)
    core.startGroup(`Patches`)
    core.info(JSON.stringify(context.patches, null, 2))
    core.endGroup()

    const changes = []
    for (const patch of context.patches) {
      const { address } = patch
      assert(
        address >= 0 && address < lines.length,
        `address must be between 0 and ${lines.length - 1} but got ${address}`,
      )
      switch (patch.operation) {
        case 'REPLACE': {
          const { replacement } = patch
          const original = lines[address]
          lines[address] = replacement
          changes.push({ address, original, updated: replacement })
          break
        }
        case 'INSERT_BEFORE': {
          const { insertion } = patch
          const original = lines[address]
          const updated = [insertion, original].join('\n')
          lines[address] = updated
          changes.push({ address, original, updated })
          break
        }
        case 'DELETE': {
          changes.push({ address, original: lines[address], updated: undefined })
          lines[address] = undefined // Mark for deletion
          break
        }
      }
    }

    core.summary.addHeading(`🔧 Edit a file`, 3)
    core.summary.addCodeBlock(context.path)
    for (const change of changes) {
      core.summary.addCodeBlock(`- ${change.original}\n+ ${change.updated ?? ''}`)
    }

    const newContent = lines.filter((line) => line !== undefined).join('\n')
    await fs.writeFile(context.path, newContent, 'utf-8')
    return { changes }
  },
})
