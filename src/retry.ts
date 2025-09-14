import * as core from '@actions/core'
import { LanguageModelMiddleware } from 'ai'

export const retryMiddleware: LanguageModelMiddleware = {
  wrapGenerate: async ({ doGenerate }) => {
    return withRetry(async () => await doGenerate())
  },
  wrapStream: async ({ doStream }) => {
    return withRetry(async () => await doStream())
  },
}

const withRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
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
        } else {
          core.warning(`Non-retryable error: ${error}`)
        }
      }
      throw error
    }
  }
}

const parseRetryAfterSec = (message: string): number | undefined => {
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
