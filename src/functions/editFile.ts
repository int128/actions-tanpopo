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
              description: 'The 1-based index of the line in the original file.',
              minimum: 1,
            },
            operation: {
              type: Type.STRING,
              enum: ['REPLACE', 'INSERT_BEFORE', 'INSERT_AFTER', 'DELETE'],
              description: 'The operation to perform on the specified line.',
            },
            operand: {
              type: Type.STRING,
              description:
                'The text to replace the line with, or to insert before/after the line. Ignored for DELETE operation.',
            },
          },
          required: ['row', 'operation', 'operand'],
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
  for (const { row, operation, operand } of patches) {
    assert(row >= 1 && row <= lines.length, `row must be between 1 and ${lines.length} but got ${row}`)
    core.info(`${row}: - ${lines[row - 1]}`)
    switch (operation) {
      case 'REPLACE':
        lines[row - 1] = operand
        break
      case 'INSERT_BEFORE':
        lines[row - 1] = [operand, lines[row - 1]].join('\n')
        break
      case 'INSERT_AFTER':
        lines[row - 1] = [lines[row - 1], operand].join('\n')
        break
      case 'DELETE':
        lines[row - 1] = null
        break
    }
    for (const line of lines[row - 1]?.split('\n') ?? []) {
      core.info(`${row}: + ${line}`)
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

type Patch = {
  row: number
  operation: 'REPLACE' | 'INSERT_BEFORE' | 'INSERT_AFTER' | 'DELETE'
  operand: string
}

function assertIsPatch(x: unknown): asserts x is Patch {
  assert(typeof x === 'object', `patch must be an object but got ${typeof x}`)
  assert(x !== null, 'patch must not be null')
  assert('row' in x, 'patch must have a row property')
  assert(typeof x.row === 'number', `row must be a number but got ${typeof x.row}`)
  assert('operation' in x, 'patch must have an operation property')
  assert(typeof x.operation === 'string', `operation must be a string but got ${typeof x.operation}`)
  assert(
    ['REPLACE', 'INSERT_BEFORE', 'INSERT_AFTER', 'DELETE'].includes(x.operation),
    `invalid operation: ${x.operation}`,
  )
  assert('operand' in x, 'patch must have an operand property')
  assert(typeof x.operand === 'string', `operand must be a string but got ${typeof x.operand}`)
}

function assertIsPatchArray(x: unknown): asserts x is Patch[] {
  assert(Array.isArray(x), `patches must be an array but got ${typeof x}`)
  for (const item of x) {
    assertIsPatch(item)
  }
}
