import * as core from '@actions/core'
import type { LanguageModelMiddleware } from 'ai'

export const loggerMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',
  wrapGenerate: async ({ doGenerate }) => {
    const response = await doGenerate()
    for (const content of response.content) {
      switch (content.type) {
        case 'text':
        case 'reasoning':
          core.info(`🤖: ${content.text}`)
          core.summary.addHeading(`🤖: ${content.text}`, 3)
          break
      }
    }
    return response
  },
  wrapStream: async ({ doStream }) => await doStream(),
}
