import { describe, expect, it } from 'vitest'

import { partialFixture } from '@/test/fixtures'
import type { User } from '@/types'

import { officialAreaLabel } from './officialArea'

describe('officialAreaLabel', () => {
  it('builds the RT label from the RT, RW, and hamlet', () => {
    const user = partialFixture<User>({
      official: { rt: { number: '001' }, rw: { number: '002' }, hamlet: { name: 'Patrol' } },
    })

    expect(officialAreaLabel(user, 'RT')).toBe('RT 001 / RW 002, Dusun Patrol')
  })

  it('builds the RW label without an RT', () => {
    const user = partialFixture<User>({ official: { rt: null, rw: { number: '002' } } })

    expect(officialAreaLabel(user, 'RW')).toBe('RW 002')
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
