import { describe, expect, it } from 'vitest'

import { matchesCondition, visibleFields } from './fieldCondition'

describe('matchesCondition', () => {
  it('compares answers as text like the backend', () => {
    expect(matchesCondition(null, {})).toBe(true)
    expect(matchesCondition({ field: 'warga', equals: 'wna' }, { warga: 'wna' })).toBe(true)
    expect(matchesCondition({ field: 'jumlah', equals: '2' }, { jumlah: 2 })).toBe(true)
    expect(matchesCondition({ field: 'jenis', in: ['a', 'b'] }, { jenis: 'b' })).toBe(true)
    expect(matchesCondition({ field: 'jenis', in: ['a'] }, {})).toBe(false)
    expect(matchesCondition({ field: 'jenis', not_in: ['a'] }, {})).toBe(true)
    expect(matchesCondition({ field: 'nik', filled: true }, { nik: '  ' })).toBe(false)
  })
})

describe('visibleFields', () => {
  const fields = [
    { name: 'warga' },
    { name: 'paspor', visibleWhen: { field: 'warga', equals: 'wna' } },
    { name: 'sponsor', visibleWhen: { field: 'paspor', filled: true } },
  ]

  it('hides fields whose condition is not met, including fields depending on hidden ones', () => {
    expect(visibleFields(fields, { warga: 'wna', paspor: 'A1' }).map((f) => f.name)).toEqual([
      'warga',
      'paspor',
      'sponsor',
    ])
    // Paspor tersisa dari pilihan sebelumnya tidak membuka sponsor.
    expect(visibleFields(fields, { warga: 'wni', paspor: 'A1' }).map((f) => f.name)).toEqual([
      'warga',
    ])
  })
})
