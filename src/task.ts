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

If there is any typo, try to fix it.
If any command failed, stop the task and return a message with the prefix of "ERROR:".

You can read a file using a command such as cat, head or tail.
You can find a keyword in a file or directory using a command such as grep.
You can modify a file using a command such as patch, sed or awk.
`

export const applyTask = async (taskDir: string, workspace: string, context: Context<WebhookEvent>) => {
  const ai = new GoogleGenAI({ apiKey: process.env.BOT_GEMINI_API_KEY })

  const prompt = `
Follow the task instruction.
The next part of this message contains the task instruction.
The current working directory contains the code to be modified.
The task instruction is located at ${context.workspace}/${taskDir}/README.md.
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
        tools: [{ functionDeclarations: [execFunctionDeclaration] }],
      },
    })
    if (response.functionCalls) {
      for (const functionCall of response.functionCalls) {
        if (functionCall.name === execFunctionDeclaration.name) {
          contents.push({ role: 'model', parts: [{ functionCall }] })
          contents.push({ role: 'user', parts: [{ functionResponse: await execFunction(functionCall, workspace) }] })
        }
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

const execFunctionDeclaration: FunctionDeclaration = {
  description: `Run a shell command in the workspace. Typical Linux commands are available, such as grep or sed.`,
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
      stdin: {
        type: Type.STRING,
        description: 'The standard input to the command',
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
  },
}

const execFunction = async (functionCall: FunctionCall, workspace: string): Promise<FunctionResponse> => {
  assert(functionCall.args)
  const { command, args, stdin } = functionCall.args
  assert(typeof command === 'string', `command must be a string but got ${typeof command}`)
  if (args !== undefined) {
    assert(Array.isArray(args), `args must be an array but got ${typeof args}`)
    assert(
      args.every((arg) => typeof arg === 'string'),
      `args must be strings but got ${args.join()}`,
    )
  }
  if (stdin !== undefined) {
    assert(typeof stdin === 'string', `stdin must be a string but got ${typeof stdin}`)
    core.info(`Executing a command with stdin:\n${stdin}`)
  }
  const { stdout, stderr, exitCode } = await exec.getExecOutput(command, args, {
    cwd: workspace,
    ignoreReturnCode: true,
    input: Buffer.from(stdin ?? ''),
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
