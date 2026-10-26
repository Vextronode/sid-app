import { describe, expect, it } from 'vitest'

import { newHeadChoice } from './familyHead'

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
