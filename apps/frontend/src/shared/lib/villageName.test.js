import { describe, expect, it } from 'vitest'

import { formatVillageName } from './villageName'

describe('formatVillageName', () => {
  it.each([
    ['Desa Cibenda', 'Desa Cibenda'],
    ['desa Cibenda', 'desa Cibenda'],
    ['Cibenda', 'Desa Cibenda'],
    ['  Cibenda  ', 'Desa Cibenda'],
    // "Desamuka" bukan awalan "Desa".
    ['Desamuka', 'Desa Desamuka'],
  ])('formats %j as %j', (input, expected) => {
    expect(formatVillageName(input)).toBe(expected)
  })

  it.each([null, undefined, '', '   ', 42])('returns null for %j', (input) => {
    expect(formatVillageName(input)).toBeNull()
  })
})
