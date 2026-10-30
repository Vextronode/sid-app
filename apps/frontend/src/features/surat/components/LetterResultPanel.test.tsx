import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { submitLetterResult, reviewLetterResult, confirmDialog } = vi.hoisted(() => ({
  submitLetterResult: vi.fn(),
  reviewLetterResult: vi.fn(),
  confirmDialog: vi.fn(),
}))

vi.mock('../api/letterExtrasApi', () => ({ submitLetterResult, reviewLetterResult }))
vi.mock('@/shared/lib/dialog', () => ({ confirmDialog }))
vi.mock('@/shared/lib/toast', () => ({ notifySuccess: vi.fn() }))

import { LetterResultPanel } from './LetterResultPanel'
import { partialFixture } from '@/test/fixtures'
import type { Letter, LetterResult } from '@/types'

const rejected = partialFixture<LetterResult>({
  id: 7,
  status: 'rejected',
  submitted_at: '2026-10-20T09:00:00Z',
  review_notes: 'Foto KK buram.',
  attachments: [{ id: 3, original_name: 'kk.jpg', url: '/api/letters/l-1/attachments/3' }],
})

describe('LetterResultPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    confirmDialog.mockResolvedValue(true)
    submitLetterResult.mockResolvedValue({})
    reviewLetterResult.mockResolvedValue({})
  })

  it('lets the applicant upload again after a rejection and shows the earlier upload', async () => {
    const onChanged = vi.fn()
    const onOpenFile = vi.fn()

    render(
      <LetterResultPanel
        letter={partialFixture<Letter>({
          id: 'l-1',
          result_stage: 'awaiting_upload',
          result_upload_hint: 'KK terbaru',
          results: [rejected],
          can_upload_result: true,
          can_review_result: false,
        })}
        onChanged={onChanged}
        onOpenFile={onOpenFile}
      />,
    )

    expect(screen.getByText(/KK terbaru/)).toBeTruthy()
    // Riwayat unggahan: status dan alasan per unggahan.
    const history = screen
      .getByRole('button', { name: 'kk.jpg' })
      .closest('.sid-result-history-item')
    expect(history.textContent).toMatch(/Ditolak/)
    expect(history.textContent).toMatch(/Alasan: Foto KK buram/)
    fireEvent.click(screen.getByRole('button', { name: 'kk.jpg' }))
    expect(onOpenFile).toHaveBeenCalledWith('/api/letters/l-1/attachments/3')

    // Unggahan terakhir ditolak: diminta unggah ulang di surat yang sama.
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toMatch(/Unggahan terakhir ditolak desa/)
    expect(alert.textContent).toMatch(/Alasan: Foto KK buram/)
    const submit = screen.getByRole('button', { name: 'Unggah ulang' })
    expect(submit).toBeDisabled()

    // Berkas dipilih bertahap; pilihan baru menambah, bukan menimpa.
    const first = new File(['kk'], 'kk-baru.pdf', { type: 'application/pdf' })
    const second = new File(['akta'], 'akta.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Berkas hasil dari instansi'), {
      target: { files: [first] },
    })
    fireEvent.change(screen.getByLabelText('Berkas hasil dari instansi'), {
      target: { files: [second] },
    })
    expect(screen.getByText('2/5 berkas dipilih.', { exact: false })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Hapus akta.jpg' }))
    fireEvent.change(screen.getByLabelText('Berkas hasil dari instansi'), {
      target: { files: [second] },
    })
    fireEvent.click(submit)

    await waitFor(() => expect(submitLetterResult).toHaveBeenCalledWith('l-1', [first, second]))
    expect(onChanged).toHaveBeenCalled()
  })

  it('lets the reviewer accept, and reject only with a reason', async () => {
    const onChanged = vi.fn()

    render(
      <LetterResultPanel
        letter={partialFixture<Letter>({
          id: 'l-1',
          result_stage: 'under_review',
          results: [rejected, { ...rejected, id: 8, status: 'submitted', review_notes: null }],
          can_upload_result: false,
          can_review_result: true,
        })}
        onChanged={onChanged}
        onOpenFile={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Unggah hasil' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Tolak' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Catatan verifikasi'), {
      target: { value: 'Bukan KK terbaru' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tolak' }))

    await waitFor(() =>
      expect(reviewLetterResult).toHaveBeenCalledWith('l-1', 8, 'rejected', 'Bukan KK terbaru'),
    )
    expect(onChanged).toHaveBeenCalled()
  })
})
