import { describe, expect, it } from 'vitest'

import { FAMILY_ROLE_LABELS, LAST_EDUCATION_LABELS, humanize, labelOf, optionsOf } from './labels'
import { formatChangeValue } from '@/features/activity-log/labels'

describe('labels', () => {
  it('humanize capitalizes every word and drops underscores', () => {
    expect(humanize('kepala_keluarga')).toBe('Kepala Keluarga')
    expect(humanize('TIDAK_SEKOLAH')).toBe('Tidak Sekolah')
    expect(humanize(null)).toBe('-')
  })

  it('labelOf prefers the explicit label and falls back to humanize', () => {
    expect(labelOf(LAST_EDUCATION_LABELS, 'smp')).toBe('SMP')
    expect(labelOf(FAMILY_ROLE_LABELS, 'anggota')).toBe('Anggota')
    expect(labelOf(FAMILY_ROLE_LABELS, '')).toBe('-')
  })

  it('optionsOf keeps the map order', () => {
    expect(optionsOf({ a: 'A', b: 'B' })).toEqual([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ])
  })

  it('activity log values use the same enum labels per field', () => {
    expect(formatChangeValue('aktif', 'family_status')).toBe('Aktif')
    expect(formatChangeValue('kepala_keluarga', 'family_role')).toBe('Kepala Keluarga')
    expect(formatChangeValue('Siti', 'name')).toBe('Siti')
  })
})
