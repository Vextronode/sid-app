import { describe, expect, it } from 'vitest'

import { getLetterProgress } from './letterProgress'

describe('getLetterProgress', () => {
  it('marks every stage done once the letter is issued', () => {
    expect(getLetterProgress({ status: 'approved' })).toMatchObject({
      tone: 'done',
      current: 4,
      rejected: false,
    })
  })

  it('continues issued service forms with the upload and verification stages', () => {
    expect(
      getLetterProgress({ status: 'approved', result_stage: 'awaiting_upload' }),
    ).toMatchObject({
      tone: 'pending',
      current: 4,
      stages: ['Diajukan', 'RT', 'Desa', 'Terbit', 'Unggah hasil', 'Verifikasi'],
    })
    expect(getLetterProgress({ status: 'approved', result_stage: 'under_review' })).toMatchObject({
      current: 5,
    })
    expect(getLetterProgress({ status: 'approved', result_stage: 'accepted' })).toMatchObject({
      tone: 'done',
      current: 6,
    })
    expect(getLetterProgress({ status: 'pending', current_step_order: 1 }).stages).toHaveLength(4)
  })

  it('warns when an issued letter has expired', () => {
    expect(getLetterProgress({ status: 'approved', is_expired: true }).message).toMatch(
      /masa berlakunya sudah habis/,
    )
  })

  it('places the letter at the approver currently holding it', () => {
    expect(
      getLetterProgress({
        status: 'in_progress',
        current_step_order: 2,
        current_step: { approver_position: 'sekretaris_desa' },
      }),
    ).toMatchObject({
      tone: 'progress',
      current: 2,
      message: 'Menunggu persetujuan Sekretaris Desa.',
    })
  })

  it('falls back to the step order when the position is unknown', () => {
    expect(getLetterProgress({ status: 'pending', current_step_order: 1 })).toMatchObject({
      tone: 'pending',
      current: 1,
      message: 'Menunggu persetujuan Ketua RT.',
    })
  })

  it('keeps letters awaiting signatures at the submission stage', () => {
    expect(getLetterProgress({ status: 'pending', awaiting_signatures: true })).toMatchObject({
      current: 0,
    })
  })

  it('marks the stage that rejected the letter', () => {
    expect(getLetterProgress({ status: 'rejected', rejected_at_step: 2 })).toMatchObject({
      tone: 'rejected',
      current: 2,
      rejected: true,
    })
  })
})
