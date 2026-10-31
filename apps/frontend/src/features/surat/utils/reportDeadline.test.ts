import { describe, expect, it } from 'vitest'
import { reportDeadlineWarning } from './reportDeadline'

const today = new Date(2026, 9, 29)
const birth = { reportDeadline: { days: 60, event: 'kelahiran' } }

describe('reportDeadlineWarning', () => {
  it('warns only after the reporting deadline has passed', () => {
    expect(reportDeadlineWarning(birth, '2026-08-30', {}, today)).toBeNull()
    expect(reportDeadlineWarning(birth, '2026-08-29', {}, today)).toContain(
      'Pelaporan kelahiran sudah lewat 61 hari, melebihi batas 60 hari',
    )
  })

  it('ignores empty dates, fields without a deadline, and unmet conditions', () => {
    expect(reportDeadlineWarning(birth, '', {}, today)).toBeNull()
    expect(reportDeadlineWarning({ reportDeadline: null }, '2020-01-01', {}, today)).toBeNull()

    const marriage = {
      reportDeadline: {
        days: 60,
        event: 'perkawinan',
        when: { field: 'agama', not_in: ['islam'] },
      },
    }
    expect(reportDeadlineWarning(marriage, '2020-01-01', { agama: 'islam' }, today)).toBeNull()
    expect(
      reportDeadlineWarning(marriage, '2020-01-01', { agama: 'kristen' }, today),
    ).not.toBeNull()
  })
})
