import { describe, expect, it } from 'vitest'

import { groupLetterTypes } from './letterTypeGroups'

describe('groupLetterTypes', () => {
  it('puts Persuratan Desa above Layanan Kependudukan and keeps the order inside each group', () => {
    const groups = groupLetterTypes([
      { code: 'F01', category: 'pelayanan' },
      { code: 'A01', category: 'persuratan' },
      { code: 'A02', category: 'persuratan' },
    ])

    expect(groups.map((group) => group.label)).toEqual(['Persuratan Desa', 'Layanan Kependudukan'])
    expect(groups[0].types.map((type) => type.code)).toEqual(['A01', 'A02'])
    expect(groups[1].types.map((type) => type.code)).toEqual(['F01'])
  })

  it('skips empty groups and treats types without a category as Persuratan Desa', () => {
    const groups = groupLetterTypes([{ code: 'A01' }])

    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('persuratan')
  })
})
