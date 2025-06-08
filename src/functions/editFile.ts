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
        minItems: '1',
        items: {
          type: Type.OBJECT,
          properties: {
            row: {
              type: Type.INTEGER,
              description: 'The 1-based index of the line in the file.',
              minimum: 1,
            },
            operation: {
              type: Type.STRING,
              description: `The operation to perform on the line.`,
              enum: ['REPLACE', 'INSERT_BEFORE', 'DELETE'],
            },
            replacement: {
              type: Type.STRING,
              description: `The text to replace the line with. Do not include any newline characters. Required for REPLACE operation.`,
            },
            insertion: {
              type: Type.STRING,
              description: `The text to insert before the line. Do not include any newline characters. Required for INSERT_BEFORE operation.`,
            },
          },
          required: ['row', 'operation'],
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
  assertIsPatchArray(patches)

  const absolutePath = path.join(context.workspace, filename)
  const originalContent = await fs.readFile(absolutePath, 'utf-8')
  const lines: (string | null)[] = originalContent.split('\n')

  core.info(`🤖 Editing ${filename} (${lines.length} lines)`)
  core.startGroup(`Patches`)
  core.info(JSON.stringify(patches, null, 2))
  core.endGroup()
  for (const patch of patches) {
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
        lines[row - 1] = null // Mark for deletion
        break
      }
    }
  }

  const newContent = lines.filter((line) => line !== null).join('\n')
  await fs.writeFile(absolutePath, newContent, 'utf-8')
  return {
    id: functionCall.id,
    name: functionCall.name,
    response: {},
  }
}

type Patch =
  | {
      operation: 'REPLACE'
      row: number
      replacement: string
    }
  | {
      operation: 'INSERT_BEFORE'
      row: number
      insertion: string
    }
  | {
      operation: 'DELETE'
      row: number
    }

function assertIsPatch(x: unknown): asserts x is Patch {
  assert(typeof x === 'object', `patch must be an object but got ${typeof x}`)
  assert(x !== null, 'patch must not be null')
  assert('operation' in x, 'patch must have an operation')
  assert(typeof x.operation === 'string', `operation must be a string but got ${typeof x.operation}`)
  switch (x.operation) {
    case 'REPLACE':
      assert('row' in x, 'REPLACE patch must have a row')
      assert(typeof x.row === 'number', `row must be a number but got ${typeof x.row}`)
      assert('replacement' in x, 'REPLACE patch must have a replacement')
      assert(typeof x.replacement === 'string', `replacement must be a string but got ${typeof x.replacement}`)
      return
    case 'INSERT_BEFORE':
      assert('row' in x, 'INSERT_BEFORE patch must have a row')
      assert(typeof x.row === 'number', `row must be a number but got ${typeof x.row}`)
      assert('insertion' in x, 'INSERT_BEFORE patch must have an insertion')
      assert(typeof x.insertion === 'string', `insertion must be a string but got ${typeof x.insertion}`)
      return
    case 'DELETE':
      assert('row' in x, 'DELETE patch must have a row')
      assert(typeof x.row === 'number', `row must be a number but got ${typeof x.row}`)
      return
    default:
      assert.fail(`unknown operation: ${x.operation}`)
  }
}

function assertIsPatchArray(x: unknown): asserts x is Patch[] {
  assert(Array.isArray(x), `patches must be an array but got ${typeof x}`)
  for (const item of x) {
    assertIsPatch(item)
  }
}
