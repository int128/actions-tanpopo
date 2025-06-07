import assert from 'assert'
import * as core from '@actions/core'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Context } from './index.js'
import { FunctionCall, FunctionDeclaration, FunctionResponse, Type } from '@google/genai'

const description = `Edit a line of an existing file in the workspace.`

export const declaration: FunctionDeclaration = {
  description,
  name: 'editFile',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: {
        type: Type.STRING,
        description: 'The path to the file to be edited. The file must already exist in the workspace.',
      },
      patches: {
        type: Type.ARRAY,
        description: `An array of patches to perform on the file.`,
        items: {
          type: Type.OBJECT,
          description: `A patch to apply to a specific line in the file.`,
          properties: {
            row: {
              type: Type.INTEGER,
              description: 'The 1-based index of the line to edit. For example, to edit the first line, set this to 1.',
            },
            replace: {
              type: Type.STRING,
              description: 'If provided, the line is replaced with this string.',
            },
            insertBefore: {
              type: Type.STRING,
              description: 'If provided, this string is inserted before the specified line.',
            },
            insertAfter: {
              type: Type.STRING,
              description: 'If provided, this string is inserted after the specified line.',
            },
            remove: {
              type: Type.BOOLEAN,
              description: 'If true, the specified line is removed from the file.',
            },
          },
          required: ['row'],
        },
      },
    },
    required: ['filename', 'patches'],
  },
  response: {},
}

export const call = async (functionCall: FunctionCall, context: Context): Promise<FunctionResponse> => {
  assert(functionCall.args)
  const { filename, patches } = functionCall.args
  assert(typeof filename === 'string', `filename must be a string but got ${typeof filename}`)
  assert(Array.isArray(patches), `patches must be an array but got ${typeof patches}`)

  const absolutePath = path.join(context.workspace, filename)
  const originalContent = await fs.readFile(absolutePath, 'utf-8')
  const lines = originalContent.split('\n')

  for (const patch of patches) {
    assertIsPatch(patch)
    const { row, replace, insertBefore, insertAfter, remove } = patch
    assert(row > 0 && row <= lines.length, `row must be between 1 and ${lines.length} but got ${row}`)
    core.info(`🤖 Editing ${filename} at line ${row} (total ${lines.length} lines)`)
    core.info(`- ${lines[row - 1]}`)
    if (replace !== undefined) {
      lines[row - 1] = replace
    }
    if (insertBefore !== undefined) {
      lines[row - 1] = [insertBefore, lines[row - 1]].join('\n')
    }
    if (insertAfter !== undefined) {
      lines[row - 1] = [lines[row - 1], insertAfter].join('\n')
    }
    if (remove) {
      lines.splice(row - 1, 1)
    } else {
      core.info(`+ ${lines[row - 1]}`)
    }
  }

  const newContent = lines.join('\n')
  await fs.writeFile(absolutePath, newContent, 'utf-8')
  return {
    id: functionCall.id,
    name: functionCall.name,
    response: {},
  }
}

type Patch = {
  row: number
  replace?: string
  insertBefore?: string
  insertAfter?: string
  remove?: boolean
}

function assertIsPatch(x: unknown): asserts x is Patch {
  assert(typeof x === 'object', `patch must be an object but got ${typeof x}`)
  assert(x !== null, 'patch must not be null')
  assert('row' in x, 'patch must have a row property')
  assert(typeof x.row === 'number', `row must be a number but got ${typeof x.row}`)
  if ('replace' in x) {
    assert(typeof x.replace === 'string', `replace must be a string but got ${typeof x.replace}`)
  }
  if ('insertBefore' in x) {
    assert(typeof x.insertBefore === 'string', `insertBefore must be a string but got ${typeof x.insertBefore}`)
  }
  if ('insertAfter' in x) {
    assert(typeof x.insertAfter === 'string', `insertAfter must be a string but got ${typeof x.insertAfter}`)
  }
  if ('remove' in x) {
    assert(typeof x.remove === 'boolean', `remove must be a boolean but got ${typeof x.remove}`)
  }
}
