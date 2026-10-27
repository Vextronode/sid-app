import { describe, expect, it } from 'vitest'

import { memberChoices, newHeadChoice } from './familyHead'

const members = [
  { id: 'c-1', name: 'Asep', family_role: 'kepala_keluarga' },
  { id: 'c-2', name: 'Iis', family_role: 'istri' },
  { id: 'c-3', name: 'Asti', family_role: 'anak' },
]
const field = { requiredWhenHead: 'anggota_pindah' }

describe('newHeadChoice', () => {
  it('offers the members who stay when the head moves out', () => {
    const choice = newHeadChoice(field, members, { anggota_pindah: ['c-1', 'c-3'] })

    expect(choice.visible).toBe(true)
    expect(choice.candidates.map((member) => member.name)).toEqual(['Iis'])
  })

  it('stays hidden when the head does not leave or nobody stays', () => {
    expect(newHeadChoice(field, members, { anggota_pindah: ['c-3'] }).visible).toBe(false)
    expect(newHeadChoice(field, members, { anggota_pindah: ['c-1', 'c-2', 'c-3'] }).visible).toBe(
      false,
    )
  })

  it('works with a single deceased member as well', () => {
    const choice = newHeadChoice({ requiredWhenHead: 'almarhum' }, members, { almarhum: 'c-1' })

    expect(choice.visible).toBe(true)
    expect(choice.candidates.map((member) => member.id)).toEqual(['c-2', 'c-3'])
  })
})

describe('memberChoices', () => {
  const family = [
    {
      id: 'c-1',
      family_role: 'kepala_keluarga',
      gender: 'L',
      date_of_birth: '1960-01-01',
      is_self: true,
    },
    { id: 'c-2', family_role: 'istri', gender: 'P', date_of_birth: '1965-01-01' },
    { id: 'c-3', family_role: 'anak', gender: 'P', date_of_birth: '1990-01-01' },
    { id: 'c-4', family_role: 'cucu', gender: 'L', date_of_birth: '2015-01-01' },
    { id: 'c-5', family_role: 'anak', gender: 'P', date_of_birth: '2012-01-01' },
  ]

  it('limits the child to its allowed roles and skips the applicant', () => {
    const field = { roles: ['anak', 'cucu', 'famili_lain'], notSelf: true }

    expect(memberChoices(field, family, {}).map((member) => member.id)).toEqual([
      'c-3',
      'c-4',
      'c-5',
    ])
  })

  it('only offers women at least ten years older than the chosen child as mother', () => {
    const field = { gender: 'P', olderThan: { field: 'anak', years: 10 } }

    // Untuk cucu (2015): nenek dan ibunya, bukan bibinya yang lahir 2012.
    expect(memberChoices(field, family, { anak: 'c-4' }).map((member) => member.id)).toEqual([
      'c-2',
      'c-3',
    ])
  })

  it('is empty when nobody qualifies', () => {
    expect(memberChoices({ roles: ['menantu'] }, family, {})).toEqual([])
  })
})
