import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { confirmDialog, notifySuccess } = vi.hoisted(() => ({
  confirmDialog: vi.fn(),
  notifySuccess: vi.fn(),
}))
vi.mock('@/shared/lib/dialog', () => ({ confirmDialog, alertDialog: vi.fn() }))
vi.mock('@/shared/lib/toast', () => ({ notifySuccess }))

vi.mock('../api', () => ({ submitDecision: vi.fn() }))

import { submitDecision } from '../api'
import ApprovalStepRenderer from './ApprovalStepRenderer'

const rtStep = { approver_position: 'rt', is_final: false }
const finalStep = { approver_position: 'kepala_desa', is_final: true }

describe('ApprovalStepRenderer regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmDialog.mockResolvedValue(true)
    submitDecision.mockResolvedValue({ data: { status: 'in_progress' } })
  })

  it('allows RT to approve and advances to the final stage', async () => {
    const onApprove = vi.fn()
    const { rerender } = render(
      <ApprovalStepRenderer
        currentStep={rtStep}
        letterStatus="pending"
        currentUserRole="rt"
        apiRole="rt"
        letterId="letter-1"
        onApprove={onApprove}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Setuju' }))
    await waitFor(() => expect(onApprove).toHaveBeenCalledOnce())
    expect(submitDecision).toHaveBeenCalledWith('rt', 'letter-1', 'approved')

    rerender(
      <ApprovalStepRenderer
        currentStep={finalStep}
        approvals={[{ approval_level: 'rt', action: 'approved' }]}
        letterStatus="in_progress"
        currentUserRole="kepala_desa"
        apiRole="kades"
        letterId="letter-1"
      />,
    )

    expect(screen.getByRole('button', { name: 'Setujui & terbitkan' })).toBeTruthy()
  })

  it.each([
    ['kepala_desa', 'kades'],
    ['sekretaris_desa', 'kades'],
  ])('%s can complete the final approval after RT approval', async (role, apiRole) => {
    render(
      <ApprovalStepRenderer
        currentStep={finalStep}
        approvals={[{ approval_level: 'rt', action: 'approved' }]}
        letterStatus="in_progress"
        currentUserRole={role}
        apiRole={apiRole}
        letterId="letter-1"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Setujui & terbitkan' }))

    await waitFor(() =>
      expect(submitDecision).toHaveBeenCalledWith('kades', 'letter-1', 'approved'),
    )
  })

  it.each([
    ['kepala_desa', 'sekretaris_desa'],
    ['sekretaris_desa', 'kepala_desa'],
  ])(
    'makes the final stage read-only for %s after the other final approver decides',
    (role, level) => {
      render(
        <ApprovalStepRenderer
          currentStep={finalStep}
          approvals={[{ approval_level: level, action: 'approved' }]}
          letterStatus="in_progress"
          currentUserRole={role}
          apiRole="kades"
          letterId="letter-1"
        />,
      )

      expect(screen.queryByRole('button', { name: 'Setuju' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Tolak' })).toBeNull()
    },
  )

  it.each(['rw', 'kadus', 'kasi_pelayanan', 'kaur_tu_umum'])(
    'renders the approval as read-only for %s',
    (role) => {
      render(
        <ApprovalStepRenderer
          currentStep={rtStep}
          letterStatus="in_progress"
          currentUserRole={role}
          apiRole={role}
          letterId="letter-1"
        />,
      )

      expect(screen.queryByRole('button', { name: 'Setuju' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Tolak' })).toBeNull()
    },
  )

  it('asks for confirmation before the final approval issues the letter', async () => {
    confirmDialog.mockResolvedValueOnce(false)
    render(
      <ApprovalStepRenderer
        currentStep={finalStep}
        approvals={[{ approval_level: 'rt', action: 'approved' }]}
        letterStatus="in_progress"
        currentUserRole="kepala_desa"
        apiRole="kades"
        letterId="letter-1"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Setujui & terbitkan' }))

    await waitFor(() =>
      expect(confirmDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Setujui dan terbitkan surat?',
          confirmLabel: 'Setujui & terbitkan',
        }),
      ),
    )
    expect(submitDecision).not.toHaveBeenCalled()
    expect(notifySuccess).not.toHaveBeenCalled()
  })

  it('shows a success toast after approving', async () => {
    render(
      <ApprovalStepRenderer
        currentStep={rtStep}
        letterStatus="pending"
        currentUserRole="rt"
        apiRole="rt"
        letterId="letter-1"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Setuju' }))

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        'Permohonan disetujui dan diteruskan ke tahap berikutnya.',
      ),
    )
  })
})
