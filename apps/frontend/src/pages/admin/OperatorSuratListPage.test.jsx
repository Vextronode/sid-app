import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const list = vi.hoisted(() => ({
  meta: { current_page: 1, per_page: 3, total: 0, last_page: 1 },
}))
const { downloadFile } = vi.hoisted(() => ({ downloadFile: vi.fn() }))

vi.mock('@/features/surat/hooks/useSuratListQuery', () => ({
  useDebouncedValue: (value) => value,
  useSuratListQuery: () => ({ letters: [], meta: list.meta, loading: false }),
  useSuratSummaryQuery: () => ({ summary: { by_type: [] } }),
}))
vi.mock('@/features/notifikasi/hooks/useLetterDeepLink', () => ({ useLetterDeepLink: () => {} }))
vi.mock('@/components/layout/SiteFooter', () => ({ SiteFooter: () => null }))
vi.mock('@/lib/downloadFile', () => ({
  downloadFile,
  downloadErrorMessage: async (_error, fallback) => fallback,
}))

import OperatorSuratListPage from './OperatorSuratListPage'
import { DialogHost } from '@/components/ui/DialogHost'
import { currentDialog, resolveDialog } from '@/shared/lib/dialog'

const renderPage = () =>
  render(
    <MemoryRouter>
      <OperatorSuratListPage />
      <DialogHost />
    </MemoryRouter>,
  )

describe('OperatorSuratListPage export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    list.meta = { current_page: 1, per_page: 3, total: 0, last_page: 1 }
  })

  afterEach(() => {
    while (currentDialog()) resolveDialog(undefined)
  })

  it('shows a centered "Data kosong" warning instead of downloading an empty report', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /Ekspor Laporan/ }))

    const dialog = screen.getByRole('alertdialog', { name: 'Data kosong' })
    expect(dialog).toHaveTextContent('Unduhan laporan gagal')
    expect(downloadFile).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Tutup' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('downloads the Excel report when the list has data', async () => {
    list.meta = { current_page: 1, per_page: 3, total: 5, last_page: 2 }
    downloadFile.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /Ekspor Laporan/ }))

    await waitFor(() => expect(downloadFile).toHaveBeenCalledTimes(1))
    expect(downloadFile.mock.calls[0][0]).toBe('/api/letters/export')
    expect(downloadFile.mock.calls[0][1]).toMatch(/^laporan-surat-\d{4}-\d{2}-\d{2}\.xlsx$/)
  })

  it('shows the warning when the server reports an empty result', async () => {
    list.meta = { current_page: 1, per_page: 3, total: 5, last_page: 2 }
    downloadFile.mockRejectedValue({ response: { status: 422 } })
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /Ekspor Laporan/ }))

    expect(await screen.findByRole('alertdialog', { name: 'Data kosong' })).toBeInTheDocument()
  })
})
