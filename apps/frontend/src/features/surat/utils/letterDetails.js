import { SURAT_STATUS } from '@/constants/suratStatus'

export const LETTER_TRACKING_STEPS = ['Pengajuan', 'RT', 'Kades', 'Selesai']

export function getLetterTrackingState(letter) {
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

export function getApplicantNik(letter) {
  return letter?.applicant_nik_masked ?? letter?.citizen?.nik_masked ?? '-'
}

export function getApplicantAddress(letter) {
  return letter?.applicant_address ?? letter?.citizen?.address ?? '-'
}
