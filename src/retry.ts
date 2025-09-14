import * as core from '@actions/core'
import { APICallError, LanguageModelMiddleware } from 'ai'

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
      if (error instanceof APICallError && error.isRetryable) {
        const retryAfterSec = parseRetryAfterSec(error.responseBody)
        if (retryAfterSec) {
          core.warning(`Retry attempt ${attempt} after ${retryAfterSec}s: ${error.message}`)
          await new Promise((resolve) => setTimeout(resolve, retryAfterSec * 1000))
          continue
        }
      }
      throw error
    }
  }
}

const parseRetryAfterSec = (message: string | undefined): number | undefined => {
  const m = message?.match(/"retryDelay":"(\d+)s"/)
  if (m) {
    const s = Number.parseInt(m[1])
    if (Number.isSafeInteger(s) && s > 0) {
      return s
    }
  }
  return 30
}
