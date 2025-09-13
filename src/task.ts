import * as core from '@actions/core'
import * as fs from 'fs/promises'
import * as functions from './functions/index.js'
import * as path from 'path'
import { Context } from './github.js'
import { WebhookEvent } from '@octokit/webhooks-types'
import { ContentListUnion, GoogleGenAI } from '@google/genai'

const systemInstruction = `
You are an agent for software development.
Follow the task instruction.
The current working directory contains the codebase of the task.
If you encounter any problem, stop the task and return a message with the prefix of "ERROR:".
Use "git grep -n" to search for text in the codebase.
Use "git ls-files" to find files in the codebase.
`

export const applyTask = async (taskDir: string, workspace: string, context: Context<WebhookEvent>) => {
  const ai = new GoogleGenAI({ apiKey: process.env.BOT_GEMINI_API_KEY })
  const taskReadme = await fs.readFile(path.join(taskDir, 'README.md'), 'utf-8')
  const contents: ContentListUnion = [{ role: 'user', parts: [{ text: taskReadme }] }]

  for (;;) {
    core.info('🤖 Thinking...')
    const response = await retryTooManyRequests(() =>
      ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-05-20',
        contents,
        config: {
          systemInstruction: [systemInstruction],
          tools: [{ functionDeclarations: functions.functions.map((tool) => tool.declaration) }],
        },
      }),
    )
    if (response.functionCalls) {
      for (const functionCall of response.functionCalls) {
        contents.push({ role: 'model', parts: [{ functionCall }] })
        contents.push({
          role: 'user',
          parts: [{ functionResponse: await functions.call(functionCall, { workspace, context }) }],
        })
      }
    } else if (response.text) {
      core.info(`🤖: ${response.text}`)
      if (response.text.startsWith('ERROR:')) {
        throw new Error(response.text)
      }
      return
    } else {
      throw new Error(`no content from the model: ${JSON.stringify(response)}`)
    }
  }
}

const retryTooManyRequests = async <T>(f: () => Promise<T>) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await f()
    } catch (error: unknown) {
      if (attempt > 3) {
        throw error
      }
      if (error instanceof Error) {
        const retryAfterSec = parseRetryAfterSec(error.message)
        if (retryAfterSec) {
          core.warning(`Retry attempt ${attempt} after ${retryAfterSec}s: ${error}`)
          await new Promise((resolve) => setTimeout(resolve, retryAfterSec * 1000))
          continue
        }
      }
      throw error
    }
  }
}

export const parseRetryAfterSec = (message: string): number | undefined => {
  if (message.match(/"code":429|"code":500/)) {
    const m = message.match(/"retryDelay":"(\d+)s"/)
    if (m) {
      const s = Number.parseInt(m[1])
      if (Number.isSafeInteger(s) && s > 0) {
        return s
      }
    }
    return 30
  }
}
