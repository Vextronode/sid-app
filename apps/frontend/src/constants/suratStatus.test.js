import { describe, expect, it } from 'vitest'
import {
  RELEVANT_STATUSES,
  STATUS_CLASSES,
  STATUS_LABELS,
  SURAT_STATUS,
  SURAT_STATUS_OPTIONS,
  SURAT_STATUS_ORDER,
} from './suratStatus'

describe('generic letter statuses', () => {
  it('exposes only the four backend status values', () => {
    expect(Object.values(SURAT_STATUS)).toEqual([
      'pending',
      'in_progress',
      'approved',
      'rejected',
    ])
  })

  it('keeps labels, styles, filters, and sorting aligned to the generic statuses', () => {
    const statusValues = Object.values(SURAT_STATUS)

    expect(SURAT_STATUS_OPTIONS.map(({ value }) => value)).toEqual(statusValues)
    expect(Object.keys(STATUS_LABELS).sort()).toEqual([...statusValues].sort())
    expect(Object.keys(STATUS_CLASSES).sort()).toEqual([...statusValues].sort())
    expect(Object.keys(SURAT_STATUS_ORDER).sort()).toEqual([...statusValues].sort())
    expect(RELEVANT_STATUSES).toEqual(statusValues)
  })
})
