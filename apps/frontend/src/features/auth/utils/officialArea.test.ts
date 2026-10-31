import { describe, expect, it } from 'vitest'

import { partialFixture } from '@/test/fixtures'
import type { User } from '@/types'

import { officialAreaLabel } from './officialArea'

describe('officialAreaLabel', () => {
  it('uses the RT label for an RT official', () => {
    const user = partialFixture<User>({
      official: { rt: { full_label: 'RT 01 / RW 02' }, rw: { full_label: 'RW 02' } },
    })

    expect(officialAreaLabel(user, 'RT')).toBe('RT 01 / RW 02')
  })

  it('uses the RW label for an RW official', () => {
    const user = partialFixture<User>({ official: { rt: null, rw: { full_label: 'RW 02' } } })

    expect(officialAreaLabel(user, 'RW')).toBe('RW 02')
  })

  it('names the hamlet of a Kadus', () => {
    const user = partialFixture<User>({ official: { hamlet: { name: 'Patrol' } } })

    expect(officialAreaLabel(user, 'dusun')).toBe('Dusun Patrol')
  })

  it('falls back when the position has no area or there is no user', () => {
    expect(officialAreaLabel(partialFixture<User>({ official: {} }), 'RT')).toBe('RT')
    expect(officialAreaLabel(null, 'dusun')).toBe('dusun')
  })
})
