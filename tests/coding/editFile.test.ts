import { describe, expect, it } from 'vitest'
import { applyPatch } from '../../src/coding/editFile.js'

describe('applyPatch', () => {
  it('replaces a line', () => {
    const lines = ['line 1', 'line 2', 'line 3']
    const result = applyPatch(lines, {
      address: 1,
      operation: 'REPLACE',
      newContent: 'new line 2',
    })
    expect(result).toBe({
      address: 1,
      diff: `- line 2\n+ new line 2`,
    })
    expect(lines).toEqual(['line 1', 'new line 2', 'line 3'])
  })
})
