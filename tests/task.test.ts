import { describe, expect, it } from 'vitest'
import { parseRetryAfterSec } from '../src/task.js'

describe('parseRetryAfterSec', () => {
  it('returns the retryDelay for 429 Too Many Requests', () => {
    const message = `ApiError: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.5-flash"},"quotaValue":"10"}]},{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"31s"}]}}`
    expect(parseRetryAfterSec(message)).toBe(31)
  })

  it('returns the default value for 500 Internal Server Error', () => {
    const message = `ApiError: {"error":{"code":500,`
    expect(parseRetryAfterSec(message)).toBe(30)
  })

  it('returns undefined for other messages', () => {
    const message = 'Some other error'
    expect(parseRetryAfterSec(message)).toBeUndefined()
  })
})
