import { describe, expect, it } from 'vitest'

import { witnessConflict } from './witness'

const fields = [
  { name: 'nik_suami', label: 'NIK Suami' },
  { name: 'nik_saksi_1', label: 'NIK Saksi I' },
  { name: 'nik_saksi_2', label: 'NIK Saksi II' },
]
const witness = { name: 'nik_saksi_2', notSameAs: ['nik_saksi_1', 'nik_suami'] }

describe('witnessConflict', () => {
  it('rejects the applicant own NIK', () => {
    expect(witnessConflict(witness, fields, { nik_saksi_2: '1' }, { isSelf: true })).toMatch(
      /NIK Anda sendiri/,
    )
  })

  it('rejects a NIK already used by a party or the other witness', () => {
    const nik = '3207240101950001'

    expect(witnessConflict(witness, fields, { nik_suami: nik, nik_saksi_2: nik }, {})).toBe(
      'NIK ini sudah diisi sebagai NIK Suami. Saksi harus orang lain.',
    )
    expect(witnessConflict(witness, fields, { nik_saksi_1: nik, nik_saksi_2: nik }, {})).toMatch(
      /NIK Saksi I\./,
    )
  })

  it('allows another person', () => {
    expect(
      witnessConflict(witness, fields, { nik_suami: '1', nik_saksi_2: '2' }, { isSelf: false }),
    ).toBeNull()
  })
})
