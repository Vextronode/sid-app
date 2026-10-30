import { describe, expect, it } from 'vitest'

import { matchesCondition, visibleFields } from './fieldCondition'
import type { SuratField } from '../types'

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

  it('combines conditions with any / all', () => {
    const any = {
      any: [
        { field: 'jenis', equals: 'skp' },
        { field: 'warga', equals: 'wna' },
      ],
    }
    expect(matchesCondition(any, { warga: 'wna' })).toBe(true)
    expect(matchesCondition(any, { warga: 'wni', jenis: 'skpln' })).toBe(false)

    const all = {
      all: [
        { field: 'warga', equals: 'wni' },
        { field: 'jenis', equals: 'skp' },
      ],
    }
    expect(matchesCondition(all, { warga: 'wni', jenis: 'skp' })).toBe(true)
    expect(matchesCondition(all, { warga: 'wni' })).toBe(false)
  })
})

describe('visibleFields', () => {
  const fields: (Pick<SuratField, 'name'> & Partial<Pick<SuratField, 'visibleWhen'>>)[] = [
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
