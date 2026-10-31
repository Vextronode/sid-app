import { SURAT_STATUS } from '@/constants/suratStatus'
import type { Citizen, Letter } from '@/types'

// Langkah UI 1 = Pengajuan, 2 = RT, 3 = Kades, 4 = Selesai.
export type LetterTrackingState = {
  currentStep: number
  rejectedStep: number | null
  completed: boolean
}

type TrackedLetter = Partial<Pick<Letter, 'status' | 'current_step_order' | 'rejected_at_step'>>

// Pemohon: NIK tersamar dan alamat dari data warganya bila dimuat.
type ApplicantLetter = Partial<Pick<Letter, 'applicant_nik_masked'>> & {
  citizen?: (Pick<Citizen, 'id'> & Partial<Pick<Citizen, 'nik_masked' | 'address'>>) | null
}

export function getLetterTrackingState(
  letter: TrackedLetter | null | undefined,
): LetterTrackingState {
  const status = letter?.status
  const currentStepOrder = Number(letter?.current_step_order)

  if (status === SURAT_STATUS.APPROVED) {
    return { currentStep: 4, rejectedStep: null, completed: true }
  }

  if (status === SURAT_STATUS.REJECTED) {
    const rejectedAtStep = Number(letter?.rejected_at_step)
    const currentStep =
      Number.isFinite(rejectedAtStep) && rejectedAtStep > 0
        ? rejectedAtStep + 1
        : currentStepOrder > 0
          ? currentStepOrder + 1
          : 2

    return {
      currentStep: Math.min(currentStep, 3),
      rejectedStep: Math.min(currentStep, 3),
      completed: false,
    }
  }

  if (status === SURAT_STATUS.PENDING) {
    return { currentStep: 1, rejectedStep: null, completed: false }
  }

  const activeStep = currentStepOrder > 0 ? currentStepOrder + 1 : 2

  return {
    currentStep: Math.min(activeStep, 3),
    rejectedStep: null,
    completed: false,
  }
}

export function getApplicantNik(letter: ApplicantLetter | null | undefined) {
  return letter?.applicant_nik_masked ?? letter?.citizen?.nik_masked ?? '-'
}

export function getApplicantAddress(letter: ApplicantLetter | null | undefined) {
  return letter?.citizen?.address ?? '-'
}
