import assert from 'node:assert'
import * as fs from 'node:fs/promises'
import * as core from '@actions/core'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const patchSchema = z
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
- REMOVE: Mark the line at the address as removed. The line will be removed after all patches are applied.
`),
    newContent: z.string().optional().describe(`The new content for the operation.`),
  })
  .describe(`A patch to manipulate a line in the file.`)

type BufferLine = string | undefined

export const applyPatch = (lines: BufferLine[], patch: z.infer<typeof patchSchema>) => {
  const { address, newContent } = patch
  const originalContent = lines[address]
  if (patch.operation === 'REPLACE') {
    assert(newContent !== undefined, 'newContent must be defined for REPLACE operation')
    assert(originalContent !== undefined, `address ${address} is already removed`)
    lines[address] = newContent
    return {
      address,
      diff: `- ${originalContent}\n+ ${newContent}`,
    }
  } else if (patch.operation === 'INSERT') {
    assert(newContent !== undefined, 'newContent must be defined for INSERT operation')
    if (originalContent === undefined) {
      lines[address] = newContent
      return {
        address,
        diff: `+ ${newContent}`,
      }
    }
    lines[address] = `${newContent}\n${originalContent}`
    return {
      address,
      diff: `+ ${newContent}\n  ${originalContent}`,
    }
  } else if (patch.operation === 'APPEND') {
    assert(newContent !== undefined, 'newContent must be defined for APPEND operation')
    if (originalContent === undefined) {
      lines[address] = newContent
      return {
        address,
        diff: `+ ${newContent}`,
      }
    }
    lines[address] = `${originalContent}\n${newContent}`
    return {
      address,
      diff: `  ${originalContent}\n+ ${newContent}`,
    }
  } else if (patch.operation === 'REMOVE') {
    assert(newContent === undefined, 'newContent must be undefined for REMOVE operation')
    assert(originalContent !== undefined, `address ${address} is already removed`)
    lines[address] = undefined
    return {
      address,
      diff: `- ${originalContent}`,
    }
  }
  throw new Error(`Unknown operation: ${patch.operation}`)
}

export const editFileTool = createTool({
  id: 'editFile',
  description: `Manipulate the lines of an existing file.
This tool applies the patches in order and finally writes the lines to the file.
`,
  inputSchema: z.object({
    path: z.string().describe('The path to the file in the repository. The file must exist.'),
    patches: z.array(patchSchema).min(1).describe(`An array of patches. The patches are applied in order.`),
  }),
  outputSchema: z.object({}),
  execute: async ({ context }) => {
    const originalContent = await fs.readFile(context.path, 'utf-8')
    const lines: BufferLine[] = originalContent.split('\n')
    const diffs = []
    for (const patch of context.patches) {
      const diff = applyPatch(lines, patch)
      diffs.push(diff)
    }

    core.info(`🤖 Edited ${context.path} (${lines.length} lines)`)
    core.startGroup(`Patch`)
    core.info(JSON.stringify(context.patches, null, 2))
    core.endGroup()
    core.summary.addHeading(`🔧 Edit a file (${lines.length} lines)`, 3)
    core.summary.addRaw(context.path, true)
    core.summary.addCodeBlock(JSON.stringify(context.patches, null, 2), 'json')
    for (const diff of diffs) {
      core.info(`@@ ${diff.address} @@`)
      core.info(diff.diff)
      core.summary.addCodeBlock(`@@ ${diff.address} @@\n${diff.diff}`, 'diff')
    }

    const newContent = lines.filter((line) => line !== undefined).join('\n')
    await fs.writeFile(context.path, newContent, 'utf-8')
    return {}
  },
})
