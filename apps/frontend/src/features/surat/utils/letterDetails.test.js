import { describe, expect, it } from 'vitest'
import { SURAT_STATUS } from '@/constants/suratStatus'
import {
  getApplicantAddress,
  getApplicantNik,
  getLetterTrackingState,
} from './letterDetails'

describe('letter details helpers', () => {
  it('reads the masked NIK and address fields provided by the API', () => {
    expect(
      getApplicantNik({
        applicant_nik_masked: '************1234',
        applicant_nik: 'must not be exposed',
      }),
    ).toBe('************1234')
    expect(getApplicantAddress({ citizen: { address: 'Jl. Merdeka' } })).toBe('Jl. Merdeka')
  })

  it('falls back to masked citizen NIK and shows an empty state for absent address', () => {
    expect(getApplicantNik({ citizen: { nik_masked: '************4321' } })).toBe(
      '************4321',
    )
    expect(getApplicantAddress({})).toBe('-')
  })

  it('tracks submission, RT, Kades, and completion as four stages', () => {
    expect(getLetterTrackingState({ status: SURAT_STATUS.PENDING }).currentStep).toBe(1)
    expect(
      getLetterTrackingState({ status: SURAT_STATUS.IN_PROGRESS, current_step_order: 1 })
        .currentStep,
    ).toBe(2)
    expect(
      getLetterTrackingState({ status: SURAT_STATUS.IN_PROGRESS, current_step_order: 2 })
        .currentStep,
    ).toBe(3)
    expect(
      getLetterTrackingState({ status: SURAT_STATUS.APPROVED }),
    ).toMatchObject({ currentStep: 4, completed: true })
  })

  it('marks the active approval step as rejected when the request is rejected', () => {
    expect(
      getLetterTrackingState({
        status: SURAT_STATUS.REJECTED,
        rejected_at_step: 2,
      }),
    ).toMatchObject({ currentStep: 3, rejectedStep: 3, completed: false })
  })
})
