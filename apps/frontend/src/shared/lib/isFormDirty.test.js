import { describe, expect, it } from 'vitest'

import { isFormDirty } from './isFormDirty'

describe('isFormDirty', () => {
  it('is clean when nothing changed, treating empty values alike', () => {
    expect(isFormDirty({ name: '', notes: null }, { name: '', notes: '' })).toBe(false)
    expect(isFormDirty({ order: '3' }, { order: 3 })).toBe(false)
  })

  it('detects changed fields, arrays, and picked files', () => {
    expect(isFormDirty({ name: 'Baru' }, { name: 'Lama' })).toBe(true)
    expect(isFormDirty({ ids: [1, 2] }, { ids: [1] })).toBe(true)
    expect(isFormDirty({ photo: new File(['x'], 'a.png') }, { photo: null })).toBe(true)
  })

  it('is clean without a baseline', () => {
    expect(isFormDirty({ name: 'x' }, null)).toBe(false)
  })
})
