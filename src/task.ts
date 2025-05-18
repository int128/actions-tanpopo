import assert from 'assert'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Context } from './github.js'
import { ContentListUnion, FunctionCall, FunctionDeclaration, FunctionResponse, GoogleGenAI, Type } from '@google/genai'
import { WebhookEvent } from '@octokit/webhooks-types'

const systemInstruction = `
You are a software engineer.

If any command failed, stop the task and return a message with the prefix of "ERROR:".
`

export const applyTask = async (taskDir: string, workspace: string, context: Context<WebhookEvent>) => {
  const ai = new GoogleGenAI({ apiKey: process.env.BOT_GEMINI_API_KEY })

  const prompt = `
Follow the task instruction.
The next part of this message contains the task instruction.

The current working directory contains the code to be modified.
The task instruction file is located at ${context.workspace}/${taskDir}/README.md.
`

  const taskReadme = await fs.readFile(path.join(taskDir, 'README.md'), 'utf-8')
  const contents: ContentListUnion = [
    {
      role: 'user',
      parts: [{ text: prompt }, { text: taskReadme }],
    },
  ]

  for (;;) {
    core.info('🤖 Thinking...')
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents,
      config: {
        systemInstruction: [systemInstruction],
        tools: [
          { functionDeclarations: [execFunctionDeclaration] },
          { functionDeclarations: [createTemporaryFileFunctionDeclaration] },
        ],
      },
    })
    if (response.functionCalls) {
      for (const functionCall of response.functionCalls) {
        contents.push({ role: 'model', parts: [{ functionCall }] })
        contents.push({
          role: 'user',
          parts: [{ functionResponse: await handleFunctionCall(functionCall, workspace, context) }],
        })
      }
    } else if (response.text) {
      core.info(`🤖: ${response.text}`)
      if (response.text.startsWith('ERROR:')) {
        throw new Error(response.text)
      }
      return
    } else {
      throw new Error(`no content from the model: ${response.promptFeedback?.blockReasonMessage}`)
    }
  }
}

const handleFunctionCall = async (
  functionCall: FunctionCall,
  workspace: string,
  context: Context<WebhookEvent>,
): Promise<FunctionResponse> => {
  switch (functionCall.name) {
    case execFunctionDeclaration.name:
      return await execFunction(functionCall, workspace)
    case createTemporaryFileFunctionDeclaration.name:
      return await createTemporaryFileFunction(functionCall, context)
    case applyPatchFunctionDeclaration.name:
      return await applyPatchFunction(functionCall)
    default:
      throw new Error(`unknown function call: ${functionCall.name}`)
  }
}

const execFunctionDeclaration: FunctionDeclaration = {
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
    required: ['command', 'args'],
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

const execFunction = async (functionCall: FunctionCall, workspace: string): Promise<FunctionResponse> => {
  assert(functionCall.args)
  const { command, args } = functionCall.args
  assert(typeof command === 'string', `command must be a string but got ${typeof command}`)
  assert(Array.isArray(args), `args must be an array but got ${typeof args}`)
  assert(
    args.every((arg) => typeof arg === 'string'),
    `args must be strings but got ${args.join()}`,
  )
  const { stdout, stderr, exitCode } = await exec.getExecOutput(command, args, {
    cwd: workspace,
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

const createTemporaryFileFunctionDeclaration: FunctionDeclaration = {
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

const createTemporaryFileFunction = async (
  functionCall: FunctionCall,
  context: Context<WebhookEvent>,
): Promise<FunctionResponse> => {
  assert(functionCall.args)
  const { content } = functionCall.args
  assert(typeof content === 'string', `content must be a string but got ${typeof content}`)
  const tempdir = await fs.mkdtemp(path.join(context.runnerTemp, 'task-'))
  const tempfile = path.join(tempdir, 'tempfile')
  await fs.writeFile(tempfile, content)
  core.info(`Temporary file created at ${tempfile}\n----\n${content}\n----`)
  return {
    id: functionCall.id,
    name: functionCall.name,
    response: {
      tempfile,
    },
  }
}

const applyPatchFunctionDeclaration: FunctionDeclaration = {
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

const applyPatchFunction = async (functionCall: FunctionCall): Promise<FunctionResponse> => {
  assert(functionCall.args)
  const { patch } = functionCall.args
  assert(typeof patch === 'string', `patch must be a string but got ${typeof patch}`)
  const { stderr, exitCode } = await exec.getExecOutput('patch', [], { input: Buffer.from(patch) })
  return {
    id: functionCall.id,
    name: functionCall.name,
    response: {
      error: exitCode === 0 ? '' : stderr,
    },
  }
}
