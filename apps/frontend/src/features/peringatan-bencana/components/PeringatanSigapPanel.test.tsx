import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TestQueryProvider } from '@/test/TestQueryProvider'
import type { DisasterAlert } from '../api'

const api = vi.hoisted(() => ({
  getDisasterAlerts: vi.fn(),
  dismissDisasterAlert: vi.fn(),
  restoreDisasterAlert: vi.fn(),
}))
const dialog = vi.hoisted(() => ({ confirmDialog: vi.fn(), promptDialog: vi.fn() }))

vi.mock('../api', () => api)
vi.mock('@/shared/lib/dialog', () => dialog)
vi.mock('@/shared/lib/toast', () => ({ notifySuccess: vi.fn() }))

import { PeringatanSigapPanel } from './PeringatanSigapPanel'

function alert(overrides: Partial<DisasterAlert> = {}): DisasterAlert {
  return {
    id: 'a-1',
    external_id: 'tsunami-882',
    type: 'tsunami',
    type_label: 'Tsunami',
    level: 'awas',
    level_label: 'Awas',
    title: 'Peringatan dini tsunami',
    message: null,
    magnitude: null,
    depth_km: null,
    location: null,
    link_url: null,
    occurred_at: '2026-11-16T14:06:00+07:00',
    // Relatif terhadap sekarang: peringatan yang lewat masa tayang disaring.
    expires_at: new Date(Date.now() + 6 * 3_600_000).toISOString(),
    status: 'active',
    source: 'SIGAP',
    sent_at: '2026-11-16T14:06:30+07:00',
    received_at: '2026-11-16T14:06:31+07:00',
    dismissed_at: null,
    dismissed_by: null,
    dismiss_reason: null,
    ...overrides,
  }
}

const tsunami = alert()
const gempa = alert({
  id: 'a-2',
  type: 'gempa',
  type_label: 'Gempa',
  level: 'waspada',
  level_label: 'Waspada',
  title: 'Gempa M6.9',
})

function mockLists(displayed: DisasterAlert[], dismissed: DisasterAlert[] = []) {
  api.getDisasterAlerts.mockImplementation((status: string) =>
    Promise.resolve(status === 'displayed' ? displayed : dismissed),
  )
}

const tableOf = (heading: string) =>
  screen.getByRole('heading', { name: heading }).closest('.sid-wilayah-table-card') as HTMLElement

describe('PeringatanSigapPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists displayed alerts, marking the one shown in the home page bar, and reports the count', async () => {
    const onCount = vi.fn()
    mockLists([tsunami, gempa])

    render(<PeringatanSigapPanel onDisplayedCountChange={onCount} />, {
      wrapper: TestQueryProvider,
    })

    const shown = await screen.findByText('Peringatan dini tsunami')
    expect(shown.closest('tr')).toHaveTextContent('Tampil di bar beranda')
    expect(screen.getByText('Gempa M6.9').closest('tr')).not.toHaveTextContent(
      'Tampil di bar beranda',
    )
    expect(
      within(tableOf('Baru diturunkan')).getByText('Belum ada peringatan yang diturunkan.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(onCount).toHaveBeenLastCalledWith(2))
  })

  it('shows the empty state when nothing is displayed', async () => {
    mockLists([])

    render(<PeringatanSigapPanel />, { wrapper: TestQueryProvider })

    expect(
      await screen.findByText('Tidak ada peringatan dari SIGAP yang sedang tampil.'),
    ).toBeInTheDocument()
  })

  it('dismisses an alert with a reason and moves it to "Baru diturunkan"', async () => {
    const user = userEvent.setup()
    mockLists([tsunami, gempa])
    dialog.promptDialog.mockResolvedValue('Alarm palsu, dikonfirmasi BPBD.')
    api.dismissDisasterAlert.mockResolvedValue({
      data: alert({
        status: 'dismissed',
        dismissed_at: '2026-11-16T14:10:00+07:00',
        dismissed_by: { id: 'u-1', name: 'Nina Rahmawati' },
        dismiss_reason: 'Alarm palsu, dikonfirmasi BPBD.',
      }),
      message: 'Peringatan diturunkan dari halaman publik.',
    })

    render(<PeringatanSigapPanel />, { wrapper: TestQueryProvider })
    const row = (await screen.findByText('Peringatan dini tsunami')).closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Turunkan' }))

    expect(dialog.promptDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Turunkan peringatan "Peringatan dini tsunami"?',
        minLength: 3,
      }),
    )
    expect(api.dismissDisasterAlert).toHaveBeenCalledWith('a-1', 'Alarm palsu, dikonfirmasi BPBD.')

    const dismissedTable = tableOf('Baru diturunkan')
    expect(await within(dismissedTable).findByText('Peringatan dini tsunami')).toBeInTheDocument()
    expect(dismissedTable).toHaveTextContent('Nina Rahmawati')
    expect(dismissedTable).toHaveTextContent('Alarm palsu, dikonfirmasi BPBD.')
    expect(
      within(tableOf('Peringatan yang sedang tampil')).queryByText('Peringatan dini tsunami'),
    ).toBeNull()
  })

  it('does nothing when the reason dialog is cancelled', async () => {
    const user = userEvent.setup()
    mockLists([tsunami])
    dialog.promptDialog.mockResolvedValue(null)

    render(<PeringatanSigapPanel />, { wrapper: TestQueryProvider })
    await user.click(await screen.findByRole('button', { name: 'Turunkan' }))

    expect(api.dismissDisasterAlert).not.toHaveBeenCalled()
  })

  it('shows a dismissed alert again after confirmation', async () => {
    const user = userEvent.setup()
    const dismissed = alert({
      status: 'dismissed',
      dismissed_at: '2026-11-16T14:10:00+07:00',
      dismissed_by: { id: 'u-1', name: 'Nina Rahmawati' },
      dismiss_reason: 'Salah turunkan.',
    })
    mockLists([], [dismissed])
    dialog.confirmDialog.mockResolvedValue(true)
    api.restoreDisasterAlert.mockResolvedValue({ data: tsunami, message: 'Ditampilkan lagi.' })

    render(<PeringatanSigapPanel />, { wrapper: TestQueryProvider })
    await user.click(await screen.findByRole('button', { name: 'Tampilkan lagi' }))

    expect(api.restoreDisasterAlert).toHaveBeenCalledWith('a-1')
    // Kedua daftar dimuat ulang supaya urutan tampil mengikuti backend.
    await waitFor(() => expect(api.getDisasterAlerts).toHaveBeenCalledTimes(4))
  })

  it('drops an alert as soon as its display time ends, without reloading', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    try {
      mockLists([alert({ expires_at: new Date(Date.now() + 30_000).toISOString() })])
      const onCount = vi.fn()

      render(<PeringatanSigapPanel onDisplayedCountChange={onCount} />, {
        wrapper: TestQueryProvider,
      })
      expect(await screen.findByText('Peringatan dini tsunami')).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(31_000)
      })

      expect(screen.queryByText('Peringatan dini tsunami')).toBeNull()
      expect(onCount).toHaveBeenLastCalledWith(0)
      expect(api.getDisasterAlerts).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps an action error visible after the lists reload', async () => {
    const user = userEvent.setup()
    mockLists([tsunami])
    dialog.promptDialog.mockResolvedValue('Alarm palsu.')
    api.dismissDisasterAlert.mockRejectedValue({
      response: {
        status: 409,
        data: { message: 'Peringatan ini sudah tidak tampil. Muat ulang daftar.' },
      },
    })

    render(<PeringatanSigapPanel />, { wrapper: TestQueryProvider })
    await user.click(await screen.findByRole('button', { name: 'Turunkan' }))

    await waitFor(() => expect(api.getDisasterAlerts).toHaveBeenCalledTimes(4))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Peringatan ini sudah tidak tampil. Muat ulang daftar.',
    )
  })
})
