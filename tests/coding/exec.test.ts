import { describe, expect, it } from 'vitest'
import { sanitizeEnv } from '../../src/coding/exec.js'

describe('sanitizeEnv', () => {
  it('removes GITHUB_ and INPUT_ variables', () => {
    const processEnv = {
      GITHUB_TOKEN: 'token',
      INPUT_SOMETHING: 'something',
      OTHER_VAR: 'other',
    }
    const sanitized = sanitizeEnv(processEnv)
    expect(sanitized).toEqual({
      OTHER_VAR: 'other',
    })
  })
})
