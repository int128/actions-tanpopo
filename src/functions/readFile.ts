import assert from 'assert'
import * as core from '@actions/core'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Context } from './index.js'
import { FunctionCall, FunctionDeclaration, FunctionResponse, Type } from '@google/genai'

const description = `Read a file in the workspace.`

export const declaration: FunctionDeclaration = {
  description,
  name: 'readFile',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: {
        type: Type.STRING,
        description: 'The path to the file. The file must already exist.',
      },
    },
    required: ['filename'],
  },
  response: {
    type: Type.OBJECT,
    properties: {
      lines: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            row: {
              type: Type.INTEGER,
              description: 'The 1-based index of the line in the file. For example, the first line is 1.',
            },
            line: {
              type: Type.STRING,
              description: 'A line read from the file. This string does not include a trailing newline character.',
            },
          },
          required: ['line'],
        },
        description: 'The array of lines read from the file.',
      },
    },
    required: ['lines'],
  },
}

export const call = async (functionCall: FunctionCall, context: Context): Promise<FunctionResponse> => {
  assert(functionCall.args)
  const { filename } = functionCall.args
  assert(typeof filename === 'string', `filename must be a string but got ${typeof filename}`)
  const absolutePath = path.join(context.workspace, filename)
  const content = await fs.readFile(absolutePath, 'utf-8')
  const lines = content.split('\n').map((line, index) => ({ row: index + 1, line }))
  core.startGroup(`🤖 Reading ${filename} (${lines.length} lines)`)
  for (const { row, line } of lines) {
    core.info(`${row}: ${line}`)
  }
  core.endGroup()
  return {
    id: functionCall.id,
    name: functionCall.name,
    response: {
      lines,
    },
  }
}
