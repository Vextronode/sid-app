import { describe, expect, it } from 'vitest'
import type { UserRole } from '@/types'

import { canDecideOnLetter } from './canDecide'
import type { CanDecideInput } from './canDecide'

const kadesStep = { approver_position: 'kepala_desa' }

describe('canDecideOnLetter', () => {
  it('lets Kades or Sekdes decide a letter whose RT stage was skipped (still pending)', () => {
    for (const currentUserRole of ['kepala_desa', 'sekretaris_desa'] satisfies UserRole[]) {
      expect(
        canDecideOnLetter({
          currentStep: kadesStep,
          letterStatus: 'pending',
          currentUserRole,
          apiRole: currentUserRole,
        }),
      ).toBe(true)
    }
  })

  it('blocks decided, finished, or other-role letters', () => {
    const base: Omit<CanDecideInput, 'letterStatus'> = {
      currentStep: kadesStep,
      currentUserRole: 'kepala_desa',
      apiRole: 'kepala_desa',
    }

    expect(canDecideOnLetter({ ...base, letterStatus: 'approved' })).toBe(false)
    expect(canDecideOnLetter({ ...base, letterStatus: 'in_progress', currentUserRole: 'rt' })).toBe(
      false,
    )
    expect(
      canDecideOnLetter({
        ...base,
        letterStatus: 'in_progress',
        approvals: [{ approval_level: 'sekretaris_desa', action: 'approved' }],
      }),
    ).toBe(false)
  })
})
