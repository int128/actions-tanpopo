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
        description: 'The path to the file. The file must already exist in the workspace.',
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
          type: Type.STRING,
        },
        description:
          'The array of lines read from the file. Each line is a string without a trailing newline character.',
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
  const lines = content.split('\n')
  core.startGroup(`🤖 Reading ${filename} (${lines.length} lines)`)
  core.info(content)
  core.endGroup()
  return {
    id: functionCall.id,
    name: functionCall.name,
    response: {
      lines,
    },
  }
}
