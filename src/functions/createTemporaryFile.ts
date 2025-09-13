import assert from 'assert'
import * as core from '@actions/core'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Context } from './index.js'
import { FunctionCall, FunctionDeclaration, FunctionResponse, Type } from '@google/genai'

export const declaration: FunctionDeclaration = {
  description: `Create a temporary file.`,
  name: 'createTemporaryFile',
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: {
        type: Type.STRING,
        description: 'The content of the temporary file',
      },
    },
    required: ['content'],
  },
  response: {
    type: Type.OBJECT,
    properties: {
      tempfile: {
        type: Type.STRING,
        description: 'The absolute path to the temporary file',
      },
    },
    required: ['tempfile'],
  },
}

export const call = async (functionCall: FunctionCall, context: Context): Promise<FunctionResponse> => {
  assert(functionCall.args)
  const { content } = functionCall.args
  assert(typeof content === 'string', `content must be a string but got ${typeof content}`)
  const tempdir = await fs.mkdtemp(path.join(context.context.runnerTemp, 'task-'))
  const tempfile = path.join(tempdir, 'tempfile')
  await fs.writeFile(tempfile, content)
  core.startGroup(`🤖 Created a temporary file at ${tempfile}`)
  core.info(content)
  core.endGroup()
  core.summary.addHeading(`🤖 Created a temporary file at ${tempfile}`, 3)
  core.summary.addCodeBlock(content)
  return {
    id: functionCall.id,
    name: functionCall.name,
    response: {
      tempfile,
    },
  }
}
