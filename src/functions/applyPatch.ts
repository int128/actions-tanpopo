import assert from 'assert'
import * as exec from '@actions/exec'
import { Context } from './index.js'
import { FunctionCall, FunctionDeclaration, FunctionResponse, Type } from '@google/genai'

export const declaration: FunctionDeclaration = {
  description: `Apply a patch to a file.`,
  name: 'applyPatch',
  parameters: {
    type: Type.OBJECT,
    properties: {
      patch: {
        type: Type.STRING,
        description: 'The patch to apply',
      },
    },
    required: ['patch'],
  },
  response: {
    type: Type.OBJECT,
    properties: {
      error: {
        type: Type.STRING,
        description: 'The error message if the patch failed. Empty if the patch succeeded',
      },
    },
    required: ['error'],
  },
}

export const call = async (functionCall: FunctionCall, context: Context): Promise<FunctionResponse> => {
  assert(functionCall.args)
  const { patch } = functionCall.args
  assert(typeof patch === 'string', `patch must be a string but got ${typeof patch}`)
  const { stderr, exitCode } = await exec.getExecOutput('patch', [], {
    input: Buffer.from(patch),
    cwd: context.workspace,
  })
  return {
    id: functionCall.id,
    name: functionCall.name,
    response: {
      error: exitCode === 0 ? '' : stderr,
    },
  }
}
