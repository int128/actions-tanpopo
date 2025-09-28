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
          newContent: z
            .string()
            .optional()
            .describe(`The new content for the line at the address.
The original content at the address is replaced with this.
To insert or append a new line, include a newline character.
To remove the line, set this to undefined.
The addresses of the consequent lines are not changed.
`),
        }),
      )
      .min(1)
      .describe(`An array of patches to manipulate the lines of the file.`),
  }),
  outputSchema: z.object({}),
  execute: async ({ context }) => {
    const originalContent = await fs.readFile(context.path, 'utf-8')
    const lines: (string | undefined)[] = originalContent.split('\n')

    core.info(`🤖 Editing ${context.path} (${lines.length} lines)`)
    core.startGroup(`Patch`)
    core.info(JSON.stringify(context.patches, null, 2))
    core.endGroup()
    core.summary.addHeading(`🔧 Edit a file (${lines.length} lines)`, 3)
    core.summary.addCodeBlock(context.path)
    for (const patch of context.patches) {
      const { address } = patch
      assert(
        address >= 0 && address < lines.length,
        `address must be between 0 and ${lines.length - 1} but got ${address}`,
      )
      const original = lines[address]
      lines[address] = patch.newContent

      const diff = []
      if (original) {
        diff.push(`- ${address}: ${original}`)
      }
      if (patch.newContent) {
        diff.push(`+ ${address}: ${patch.newContent}`)
      }
      core.info(diff.join('\n'))
      core.summary.addCodeBlock(diff.join('\n'), 'diff')
    }

    const newContent = lines.filter((line) => line !== undefined).join('\n')
    await fs.writeFile(context.path, newContent, 'utf-8')
    return {}
  },
})
