import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { notifySuccess, notifyError } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}))
vi.mock('@/shared/lib/toast', () => ({ notifySuccess, notifyError }))

const { getLetterExpiryReminderSettings, updateLetterExpiryReminderSetting } = vi.hoisted(() => ({
  getLetterExpiryReminderSettings: vi.fn(),
  updateLetterExpiryReminderSetting: vi.fn(),
}))
vi.mock('../api/letterExpiryReminderSettingApi', () => ({
  getLetterExpiryReminderSettings,
  updateLetterExpiryReminderSetting,
}))

import ExpiryReminderSettingsPanel from './ExpiryReminderSettingsPanel'

const SETTINGS = [
  { id: 5, days_before: 1, is_active: true, activated_at: '2026-11-01T10:00:00+07:00' },
  { id: 1, days_before: 30, is_active: true, activated_at: '2026-11-01T10:00:00+07:00' },
  { id: 2, days_before: 14, is_active: true, activated_at: '2026-11-01T10:00:00+07:00' },
  { id: 3, days_before: 7, is_active: true, activated_at: '2026-11-01T10:00:00+07:00' },
  { id: 4, days_before: 3, is_active: false, activated_at: '2026-11-01T10:00:00+07:00' },
]

describe('ExpiryReminderSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLetterExpiryReminderSettings.mockResolvedValue(SETTINGS)
  })

  it('shows the five points from the API, farthest first, plus a locked day-H row', async () => {
    render(<ExpiryReminderSettingsPanel />)

    const switches = await screen.findAllByRole('switch')
    expect(switches).toHaveLength(5)
    expect(switches.map((toggle) => toggle.getAttribute('aria-checked'))).toEqual([
      'true',
      'true',
      'true',
      'false',
      'true',
    ])
    expect(screen.getByRole('switch', { name: 'H-30' })).toHaveAccessibleDescription(
      '30 hari sebelum kedaluwarsa',
    )
    expect(screen.getByRole('switch', { name: 'H-1' })).toHaveAccessibleDescription(
      'Hari terakhir masa berlaku',
    )

    const dayH = screen.getByText('Hari H').closest('li') as HTMLElement
    expect(within(dayH).getByText('Selalu dikirim')).toBeInTheDocument()
    expect(within(dayH).queryByRole('switch')).not.toBeInTheDocument()
  })

  it('saves immediately when a switch is toggled', async () => {
    const user = userEvent.setup()
    updateLetterExpiryReminderSetting.mockResolvedValue({
      ...SETTINGS[3],
      is_active: true,
      activated_at: '2026-11-12T09:00:00+07:00',
    })
    render(<ExpiryReminderSettingsPanel />)

    const toggle = await screen.findByRole('switch', { name: 'H-3' })
    await user.click(toggle)

    expect(updateLetterExpiryReminderSetting).toHaveBeenCalledWith(4, true)
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Pengingat H-3 dinyalakan.'))
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(notifyError).not.toHaveBeenCalled()
  })

  it('reverts the switch and shows an error toast when saving fails', async () => {
    const user = userEvent.setup()
    let rejectRequest: (reason: unknown) => void = () => {}
    updateLetterExpiryReminderSetting.mockReturnValue(
      new Promise((_, reject) => {
        rejectRequest = reject
      }),
    )
    render(<ExpiryReminderSettingsPanel />)

    const toggle = await screen.findByRole('switch', { name: 'H-7' })
    await user.click(toggle)

    // Optimistis: langsung berubah dan terkunci selama menyimpan.
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(toggle).toBeDisabled()

    rejectRequest(new Error('Network Error'))

    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
    expect(toggle).toBeEnabled()
    expect(notifyError).toHaveBeenCalledTimes(1)
    expect(notifySuccess).not.toHaveBeenCalled()
  })

  it('shows an error instead of the list when loading fails', async () => {
    getLetterExpiryReminderSettings.mockRejectedValue(new Error('boom'))
    render(<ExpiryReminderSettingsPanel />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.queryByText('Hari H')).not.toBeInTheDocument()
  })
})
