import assert from 'assert'
import * as exec from '@actions/exec'
import { Context } from './index.js'
import { FunctionCall, FunctionDeclaration, FunctionResponse, Type } from '@google/genai'

export const declaration: FunctionDeclaration = {
  description: `Run a shell command in the workspace. Typical Linux commands are available such as find, grep or sed`,
  name: 'exec',
  parameters: {
    type: Type.OBJECT,
    properties: {
      command: {
        type: Type.STRING,
        description: 'The command to run',
      },
      args: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
          description: 'The arguments to the command',
        },
      },
    },
    required: ['command'],
  },
  response: {
    type: Type.OBJECT,
    properties: {
      stdout: {
        type: Type.STRING,
        description: 'The standard output of the command',
      },
      stderr: {
        type: Type.STRING,
        description: 'The standard error of the command',
      },
      exitCode: {
        type: Type.NUMBER,
        description: 'The exit code of the command. 0 means success, non-zero means failure',
      },
    },
    required: ['stdout', 'stderr', 'exitCode'],
  },
}

export const call = async (functionCall: FunctionCall, context: Context): Promise<FunctionResponse> => {
  assert(functionCall.args)
  const { command, args } = functionCall.args
  assert(typeof command === 'string', `command must be a string but got ${typeof command}`)
  if (args !== undefined) {
    assert(Array.isArray(args), `args must be an array but got ${typeof args}`)
    assert(
      args.every((arg) => typeof arg === 'string'),
      `args must be strings but got ${args.join()}`,
    )
  }
  const { stdout, stderr, exitCode } = await exec.getExecOutput(command, args, {
    cwd: context.workspace,
    ignoreReturnCode: true,
  })
  return {
    id: functionCall.id,
    name: functionCall.name,
    response: {
      stdout,
      stderr,
      exitCode,
    },
  }
}
