import assert from 'node:assert'
import * as fs from 'node:fs/promises'
import * as core from '@actions/core'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const editFileTool = createTool({
  id: 'editFile',
  description: `Manipulate the lines of an existing file.
This tool applies the patches in order and finally writes the lines to the file.
`,
  inputSchema: z.object({
    path: z.string().describe('The path to the file in the repository. The file must exist.'),
    patches: z
      .array(
        z.object({
          address: z
            .int()
            .min(0)
            .describe(`The 0-based address of the line in the file.
Address 0 is the first line.
The addresses in the file are not changed during the patch operations.
`),
          replacement: z
            .string()
            .optional()
            .describe(`The new content for the address.
For example:
- If you want to replace the content of the line with FOO, set this to "FOO".
- If you want to insert a new line character after FOO, set this to "FOO\\n". The addresses of the consequent lines are not changed.
- If you want to replace the line with the 2 lines, set this to "FOO\\nBAR". The addresses of the consequent lines are not changed.
- If you want to replace the line with an empty line, set this to "".
- If this is not set, remove the line. The addresses of the consequent lines are not changed.
`),
        }),
      )
      .min(1)
      .describe(`An array of patches to manipulate the lines of the file.`),
  }),
  outputSchema: z.object({
    changes: z
      .array(
        z.object({
          address: z.number().int().min(0).describe('The address of the line in the file.'),
          original: z.string().optional().describe('The original content of the line.'),
          updated: z
            .string()
            .optional()
            .describe('The updated content of the line. If this is not set, the line will be removed.'),
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
      const original = lines[address]
      lines[address] = patch.replacement
      changes.push({ address, original, updated: patch.replacement })
    }

    core.info(`🤖 Edited ${context.path} (${lines.length} lines)`)
    core.startGroup(`Patch`)
    core.info(JSON.stringify(context.patches, null, 2))
    core.endGroup()
    core.summary.addHeading(`🔧 Edit a file (${lines.length} lines)`, 3)
    core.summary.addCodeBlock(context.path)
    for (const change of changes) {
      const diff = []
      if (change.original) {
        diff.push(`- ${change.address}: ${change.original}`)
      }
      if (change.updated) {
        diff.push(`+ ${change.address}: ${change.updated}`)
      }
      core.info(diff.join('\n'))
      core.summary.addCodeBlock(diff.join('\n'), 'diff')
    }

    const newContent = lines.filter((line) => line !== undefined).join('\n')
    await fs.writeFile(context.path, newContent, 'utf-8')
    return { changes }
  },
})
