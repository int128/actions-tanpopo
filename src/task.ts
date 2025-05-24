import * as core from '@actions/core'
import * as fs from 'fs/promises'
import * as functions from './functions/index.js'
import * as path from 'path'
import { Context } from './github.js'
import { WebhookEvent } from '@octokit/webhooks-types'
import { ContentListUnion, GoogleGenAI } from '@google/genai'

const systemInstruction = `
You are a software engineer.

If the task failed, stop the task and return a message with the prefix of "ERROR:".
Use applyPatch tool to edit files.
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
        tools: [{ functionDeclarations: functions.functions.map((tool) => tool.declaration) }],
      },
    })
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
