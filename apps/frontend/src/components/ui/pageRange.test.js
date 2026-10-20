import { describe, expect, it } from 'vitest'

import { formatPageRange } from './pageRange'

describe('formatPageRange', () => {
  it('shows the rows of the active page out of the total', () => {
    expect(formatPageRange(1, 50, 266)).toBe('1–50 dari 266 data')
    expect(formatPageRange(6, 50, 266)).toBe('251–266 dari 266 data')
  })

  it('names the unit and handles empty lists', () => {
    expect(formatPageRange(2, 10, 15, 'KK')).toBe('11–15 dari 15 KK')
    expect(formatPageRange(1, 10, 0, 'pengguna')).toBe('0 dari 0 pengguna')
  })
})
