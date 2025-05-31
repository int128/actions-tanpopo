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

If you encounter any problem, stop the task and return a message with the prefix of "ERROR:".

The current working directory contains the code to be modified.
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
      throw new Error(`no content from the model: ${response.promptFeedback?.blockReasonMessage}`)
    }
  }
}

const retryTooManyRequests = async <T>(f: () => Promise<T>) => {
  for (let i = 0; ; i++) {
    try {
      return await f()
    } catch (e: unknown) {
      if (i > 3) {
        throw e
      }
      if (e instanceof Error) {
        const m = e.message.match(/429 Too Many Requests.+"retryDelay":"(\d+)s"/)
        if (m) {
          const seconds = Number.parseInt(m[1])
          core.warning(`Retry after ${seconds}s: ${e}`)
          await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
          continue
        }
      }
      throw e
    }
  }
}
