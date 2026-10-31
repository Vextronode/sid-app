import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import SuratDetailModal from '@/features/approval/components/SuratDetailModal'
import { useSuratDetail } from '@/features/approval/hooks/useSuratDetail'
import { useAuth } from '@/features/auth/contexts/AuthContext'

import SuratDetailModalRT from './SuratDetailModalRT'

vi.mock('@/features/approval/components/SuratDetailModal', () => ({ default: vi.fn(() => null) }))
vi.mock('@/features/approval/hooks/useSuratDetail', () => ({ useSuratDetail: vi.fn() }))
vi.mock('@/features/auth/contexts/AuthContext', () => ({ useAuth: vi.fn() }))

const mockedModal = vi.mocked(SuratDetailModal)
const mockedUseSuratDetail = vi.mocked(useSuratDetail, { partial: true, deep: true })
const mockedUseAuth = vi.mocked(useAuth, { partial: true, deep: true })

describe('SuratDetailModalRT', () => {
  // Regresi: modal RT dulu tidak meneruskan onConflict, sehingga setelah 409
  // (surat sudah diproses orang lain) tombol keputusan tetap tampil dengan data lama.
  it('reloads the letter when a decision conflicts with a newer state', () => {
    const refresh = vi.fn()
    mockedUseSuratDetail.mockReturnValue({
      surat: { id: 'letter-5', submitted_by: 'user-99', citizen_id: null },
      notFound: false,
      refresh,
    })
    mockedUseAuth.mockReturnValue({ user: { id: 'user-1', role: 'rt' } })

    render(<SuratDetailModalRT suratId="letter-5" onClose={vi.fn()} />)

    expect(mockedModal.mock.lastCall?.[0].onConflict).toBe(refresh)
  })
})
