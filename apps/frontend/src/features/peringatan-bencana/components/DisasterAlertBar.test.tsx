import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PublicDisasterAlert } from '../api'

const api = vi.hoisted(() => ({ getPublicDisasterAlerts: vi.fn() }))
vi.mock('../api', () => api)

import { DisasterAlertBar, PublicDisasterAlertBar } from './DisasterAlertBar'

function alert(overrides: Partial<PublicDisasterAlert> = {}): PublicDisasterAlert {
  return {
    id: 'a-1',
    type: 'tsunami',
    type_label: 'Tsunami',
    level: 'awas',
    level_label: 'Awas',
    title: 'Peringatan dini tsunami pesisir selatan',
    message: 'Segera menjauh dari pantai menuju tempat tinggi.',
    magnitude: 7.1,
    depth_km: 10,
    location: '23 km barat daya Cibenda',
    link_url: 'https://sigap.example.id/kejadian/882',
    occurred_at: new Date(Date.now() - 60_000).toISOString(),
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    ...overrides,
  }
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
}

describe('DisasterAlertBar', () => {
  it('renders only an empty live region when there is no alert', () => {
    const { container } = render(<DisasterAlertBar alerts={[]} />)

    expect(screen.queryByRole('region', { name: 'Peringatan bencana' })).toBeNull()
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull()
  })

  it('shows the top alert with its level and how many others there are', () => {
    render(
      <DisasterAlertBar
        alerts={[
          alert(),
          alert({ id: 'a-2', type_label: 'Gempa', level_label: 'Waspada', title: 'Gempa M6.9' }),
          alert({ id: 'a-3', type_label: 'Gempa', level_label: 'Waspada', title: 'Gempa susulan' }),
        ]}
      />,
    )

    const region = screen.getByRole('region', { name: 'Peringatan bencana' })
    expect(region).toHaveTextContent('Awas')
    expect(region).toHaveTextContent('Tsunami: Peringatan dini tsunami pesisir selatan')
    expect(region).toHaveTextContent('+2 peringatan lain')
    expect(screen.queryByText('Gempa susulan')).toBeNull()
  })

  it('opens the details of every alert, with the SIGAP link in a new tab', async () => {
    const user = userEvent.setup()
    render(
      <DisasterAlertBar
        alerts={[alert(), alert({ id: 'a-2', title: 'Gempa susulan', link_url: null })]}
      />,
    )

    const toggle = screen.getByRole('button', { name: /Selengkapnya/ })
    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const panel = screen.getByRole('list')
    expect(within(panel).getAllByRole('listitem')).toHaveLength(2)
    expect(panel).toHaveTextContent('Segera menjauh dari pantai menuju tempat tinggi.')
    expect(panel).toHaveTextContent('M7,1 · kedalaman 10 km · 23 km barat daya Cibenda')
    expect(within(panel).getByText('Gempa susulan')).toBeInTheDocument()

    const link = within(panel).getByRole('link', { name: /Lihat detail di SIGAP/ })
    expect(link).toHaveAttribute('href', 'https://sigap.example.id/kejadian/882')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('PublicDisasterAlertBar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    setVisibility('visible')
    api.getPublicDisasterAlerts.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    setVisibility('visible')
  })

  it('loads alerts and hides one as soon as it expires', async () => {
    api.getPublicDisasterAlerts.mockResolvedValue([
      alert({ expires_at: new Date(Date.now() + 30_000).toISOString() }),
    ])

    render(<PublicDisasterAlertBar />)

    expect(await screen.findByRole('region', { name: 'Peringatan bencana' })).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000)
    })

    expect(screen.queryByRole('region', { name: 'Peringatan bencana' })).toBeNull()
  })

  it('refreshes every minute only while the tab is visible', async () => {
    api.getPublicDisasterAlerts.mockResolvedValue([])
    render(<PublicDisasterAlertBar />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(api.getPublicDisasterAlerts).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(api.getPublicDisasterAlerts).toHaveBeenCalledTimes(2)

    setVisibility('hidden')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })
    expect(api.getPublicDisasterAlerts).toHaveBeenCalledTimes(2)

    // Langsung dimuat lagi saat tab kembali terlihat.
    setVisibility('visible')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(api.getPublicDisasterAlerts).toHaveBeenCalledTimes(3)
  })

  it('keeps showing the last alerts when a refresh fails', async () => {
    api.getPublicDisasterAlerts
      .mockResolvedValueOnce([alert()])
      .mockRejectedValueOnce(new Error('Network Error'))

    render(<PublicDisasterAlertBar />)
    expect(await screen.findByRole('region', { name: 'Peringatan bencana' })).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })

    expect(api.getPublicDisasterAlerts).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('region', { name: 'Peringatan bencana' })).toBeInTheDocument()
  })
})
