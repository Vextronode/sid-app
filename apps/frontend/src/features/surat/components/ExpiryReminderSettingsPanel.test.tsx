import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { notifySuccess, notifyError } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}))
vi.mock('@/shared/lib/toast', () => ({ notifySuccess, notifyError }))

const {
  getLetterExpiryReminderSettings,
  updateLetterExpiryReminderSetting,
  updateLetterExpiryReminderSendTime,
} = vi.hoisted(() => ({
  getLetterExpiryReminderSettings: vi.fn(),
  updateLetterExpiryReminderSetting: vi.fn(),
  updateLetterExpiryReminderSendTime: vi.fn(),
}))
vi.mock('../api/letterExpiryReminderSettingApi', () => ({
  getLetterExpiryReminderSettings,
  updateLetterExpiryReminderSetting,
  updateLetterExpiryReminderSendTime,
}))

import ExpiryReminderSettingsPanel from './ExpiryReminderSettingsPanel'

const SETTINGS = [
  { id: 5, days_before: 1, is_active: true, activated_at: '2026-11-01T10:00:00+07:00' },
  { id: 1, days_before: 30, is_active: true, activated_at: '2026-11-01T10:00:00+07:00' },
  { id: 2, days_before: 14, is_active: true, activated_at: '2026-11-01T10:00:00+07:00' },
  { id: 3, days_before: 7, is_active: true, activated_at: '2026-11-01T10:00:00+07:00' },
  { id: 4, days_before: 3, is_active: false, activated_at: '2026-11-01T10:00:00+07:00' },
]

const SEND_AT_OPTIONS = ['06:00', '07:00', '08:00', '09:00', '16:00', '21:00']

describe('ExpiryReminderSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLetterExpiryReminderSettings.mockResolvedValue({
      points: SETTINGS,
      sendAt: '09:00',
      sendAtOptions: SEND_AT_OPTIONS,
    })
  })

  it('shows the send time and options from the API', async () => {
    render(<ExpiryReminderSettingsPanel />)

    const select = await screen.findByRole('combobox', { name: 'Jam kirim' })
    expect(select).toHaveValue('09:00')
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['06.00 WIB', '07.00 WIB', '08.00 WIB', '09.00 WIB', '16.00 WIB', '21.00 WIB'])
    // Jam tidak lagi ditulis langsung di keterangan kartu.
    expect(screen.queryByText(/Dikirim pukul/)).not.toBeInTheDocument()
  })

  it('saves the send time immediately when another hour is chosen', async () => {
    const user = userEvent.setup()
    updateLetterExpiryReminderSendTime.mockResolvedValue('16:00')
    render(<ExpiryReminderSettingsPanel />)

    const select = await screen.findByRole('combobox', { name: 'Jam kirim' })
    await user.selectOptions(select, '16:00')

    expect(updateLetterExpiryReminderSendTime).toHaveBeenCalledWith('16:00')
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith('Jam kirim pengingat diubah ke 16.00 WIB.'),
    )
    expect(select).toHaveValue('16:00')
    expect(notifyError).not.toHaveBeenCalled()
  })

  it('reverts the send time and shows an error toast when saving fails', async () => {
    const user = userEvent.setup()
    let rejectRequest: (reason: unknown) => void = () => {}
    updateLetterExpiryReminderSendTime.mockReturnValue(
      new Promise((_, reject) => {
        rejectRequest = reject
      }),
    )
    render(<ExpiryReminderSettingsPanel />)

    const select = await screen.findByRole('combobox', { name: 'Jam kirim' })
    await user.selectOptions(select, '16:00')

    expect(select).toHaveValue('16:00')
    expect(select).toBeDisabled()

    rejectRequest(new Error('Network Error'))

    await waitFor(() => expect(select).toHaveValue('09:00'))
    expect(select).toBeEnabled()
    expect(notifyError).toHaveBeenCalledTimes(1)
    expect(notifySuccess).not.toHaveBeenCalled()
  })

  it('keeps showing a stored send time that is outside the options', async () => {
    getLetterExpiryReminderSettings.mockResolvedValue({
      points: SETTINGS,
      sendAt: '23:00',
      sendAtOptions: SEND_AT_OPTIONS,
    })
    render(<ExpiryReminderSettingsPanel />)

    expect(await screen.findByRole('combobox', { name: 'Jam kirim' })).toHaveValue('23:00')
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
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText('Hari H')).not.toBeInTheDocument()
  })
})
