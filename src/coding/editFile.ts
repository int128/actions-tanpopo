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
        z
          .object({
            address: z
              .int()
              .min(0)
              .describe(`0-based address of the line in the file.
Address 0 is the first line.
An address is immutable, it always points to the same line even if lines are added or removed before it.
`),
            operation: z.enum(['REPLACE', 'INSERT', 'APPEND', 'REMOVE']).describe(`The operation to perform on the line.
- REPLACE: Replace the line at the address with the new content.
- INSERT: Insert a new line before the line at the address.
- APPEND: Insert a new line after the line at the address.
- REMOVE: Remove the line at the address.
`),
            newContent: z.string().optional().describe(`The new content for the operation.`),
          })
          .describe(`A patch to manipulate a line in the file.`),
      )
      .min(1)
      .describe(`An array of patches. The patches are applied in order.`),
  }),
  outputSchema: z.object({}),
  execute: async ({ context }) => {
    const originalContent = await fs.readFile(context.path, 'utf-8')
    const lines: (string | undefined)[] = originalContent.split('\n')

    const diffs = []
    for (const patch of context.patches) {
      const { address, operation, newContent } = patch
      switch (operation) {
        case 'REPLACE': {
          assert(newContent !== undefined, 'newContent must be defined for REPLACE operation')
          const originalContent = lines[address]
          lines[address] = newContent
          diffs.push(`\
- ${address}: ${originalContent}
+ ${address}: ${newContent}`)
          break
        }
        case 'INSERT': {
          assert(newContent !== undefined, 'newContent must be defined for INSERT operation')
          const originalContent = lines[address]
          lines[address] = `${newContent}\n${originalContent}`
          diffs.push(`\
+ ${address}: ${newContent}
  ${address}: ${originalContent}`)
          break
        }
        case 'APPEND': {
          assert(newContent !== undefined, 'newContent must be defined for APPEND operation')
          const originalContent = lines[address]
          lines[address] = `${originalContent}\n${newContent}`
          diffs.push(`\
  ${address}: ${originalContent}
+ ${address}: ${newContent}`)
          break
        }
        case 'REMOVE': {
          assert(newContent === undefined, 'newContent must be undefined for REMOVE operation')
          assert(address < lines.length, `address ${address} is out of bounds for REMOVE operation`)
          const originalContent = lines[address]
          lines[address] = undefined
          diffs.push(`- ${address}: ${originalContent}`)
          break
        }
        default:
          throw new Error(`Unknown operation: ${operation}`)
      }
    }

    core.info(`🤖 Edited ${context.path} (${lines.length} lines)`)
    core.startGroup(`Patch`)
    core.info(JSON.stringify(context.patches, null, 2))
    core.endGroup()
    core.summary.addHeading(`🔧 Edit a file (${lines.length} lines)`, 3)
    core.summary.addCodeBlock(context.path)
    for (const diff of diffs) {
      core.info(diff)
      core.summary.addCodeBlock(diff, 'diff')
    }

    const newContent = lines.filter((line) => line !== undefined).join('\n')
    await fs.writeFile(context.path, newContent, 'utf-8')
    return {}
  },
})
