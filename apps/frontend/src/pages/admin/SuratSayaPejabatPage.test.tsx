import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LetterListItem, LetterType } from '@/types'

const { useLetters, useLetterTypes } = vi.hoisted(() => ({
  useLetters: vi.fn(),
  useLetterTypes: vi.fn(),
}))

vi.mock('@/features/surat/hooks/useLetters', () => ({ useLetters }))
vi.mock('@/features/surat/hooks/useLetterTypes', () => ({ useLetterTypes }))
vi.mock('@/features/surat/components/MyLettersList', () => ({ MyLettersList: (): null => null }))
// Modal detail diganti tiruan yang memanggil "Ajukan lagi" untuk surat itu;
// perilaku tombolnya sendiri diuji di DetailSuratModal.test.tsx.
vi.mock('@/features/surat/components/DetailSuratModal', () => ({
  DetailSuratModal: ({
    data,
    onReapply,
  }: {
    data: LetterListItem
    onReapply?: (code: string) => void
  }) => (
    <div role="dialog" aria-label="Detail surat">
      <button type="button" onClick={() => onReapply?.(data.letter_type?.code ?? '')}>
        Ajukan lagi
      </button>
    </div>
  ),
}))
vi.mock('@/features/surat/components/LetterTypePicker', () => ({
  LetterTypePicker: ({ selectedCode }: { selectedCode: string }) => (
    <p>Jenis terpilih: {selectedCode || '-'}</p>
  ),
}))
vi.mock('@/features/surat/components/DynamicSuratForm', () => ({
  DynamicSuratForm: ({ config }: { config: { code: string } }) => <p>Formulir {config.code}</p>,
}))
vi.mock('@/features/surat/utils/letterTypeConfig', () => ({
  getLetterTypeFormConfig: (type?: LetterType) => (type ? { code: type.code } : null),
}))

import SuratSayaPejabatPage from './SuratSayaPejabatPage'

const expiredLetter = {
  id: 'letter-1',
  status: 'approved',
  is_expired: true,
  expires_at: '2026-01-10T16:59:59Z',
  letter_type: { id: 1, name: 'Surat Keterangan Domisili', code: 'SKD' },
}

describe('SuratSayaPejabatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useLetters.mockReturnValue({
      letters: [expiredLetter],
      meta: { current_page: 1, per_page: 10, total: 1, last_page: 1 },
      loading: false,
      refresh: vi.fn(),
    })
    useLetterTypes.mockReturnValue({
      letterTypes: [{ id: 1, code: 'SKD', name: 'Surat Keterangan Domisili' }],
      loading: false,
      error: '',
    })
  })

  it('"Ajukan lagi" closes the detail and opens the personal form with the same type', async () => {
    const user = userEvent.setup()
    const client = new QueryClient()

    // Dibuka dari notifikasi pengingat masa berlaku.
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/admin/surat-saya?surat=letter-1']}>
          <SuratSayaPejabatPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await user.click(await screen.findByRole('button', { name: 'Ajukan lagi' }))

    expect(screen.queryByRole('dialog', { name: 'Detail surat' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Ajukan surat' })).toBeInTheDocument()
    expect(screen.getByText('Jenis terpilih: SKD')).toBeInTheDocument()
    expect(screen.getByText('Formulir SKD')).toBeInTheDocument()
  })
})
