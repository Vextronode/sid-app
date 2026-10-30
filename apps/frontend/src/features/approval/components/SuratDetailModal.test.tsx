import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/surat/components/LetterExtrasPanel', () => ({
  LetterExtrasPanel: (): null => null,
}))
vi.mock('@/features/cetak-surat/components/PdfCanvasPreview', () => ({
  PdfCanvasPreview: ({ surat }: { surat: { id: string } }) => (
    <div data-testid="pdf-canvas-preview">{surat.id}</div>
  ),
}))

import type { ComponentProps } from 'react'

import { partialFixture } from '@/test/fixtures'
import type { Letter } from '@/types'

import SuratDetailModal from './SuratDetailModal'

const rtStep = { approver_position: 'rt', is_final: false }
const finalStep = { approver_position: 'kepala_desa', is_final: true }

const pendingAtRt = partialFixture<Letter>({
  id: 'letter-41',
  status: 'pending',
  current_step_order: 1,
  current_step: rtStep,
  letter_type: { name: 'Surat Keterangan Usaha' },
  approvals: [],
})

const atFinal = partialFixture<Letter>({
  ...pendingAtRt,
  status: 'in_progress',
  current_step_order: 2,
  current_step: finalStep,
  approvals: [
    {
      id: 1,
      approval_level: 'rt',
      action: 'approved',
      approver_name: 'Rudi Nugraha',
      notes: 'Data sesuai.',
      created_at: '2026-10-20T01:12:00Z',
    },
  ],
})

function renderModal(props: Partial<ComponentProps<typeof SuratDetailModal>>) {
  return render(
    <SuratDetailModal
      suratId="letter-41"
      onClose={vi.fn()}
      surat={null}
      notFound={false}
      {...props}
    />,
  )
}

describe('SuratDetailModal (approver)', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockImplementation((): null => null)
  })

  it('shows the draft in the modal and the RT decision in the footer', () => {
    renderModal({ surat: pendingAtRt, viewerRole: 'rt', currentUserRole: 'rt', apiRole: 'rt' })

    expect(screen.getByTestId('pdf-canvas-preview')).toHaveTextContent('letter-41')
    expect(screen.getByRole('button', { name: 'Setuju' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tolak' })).toBeInTheDocument()
    expect(screen.getByText(/meneruskan ke Kepala Desa/)).toBeInTheDocument()
    expect(window.open).not.toHaveBeenCalled()
  })

  it('lets RW only monitor: no decision, no download, approver details in the timeline', () => {
    renderModal({ surat: atFinal, viewerRole: 'rw' })

    expect(screen.queryByRole('button', { name: /Setuju/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Unduh/ })).toBeNull()
    expect(screen.getByText(/Anda memantau surat/)).toBeInTheDocument()
    expect(screen.getByText(/Rudi Nugraha/)).toBeInTheDocument()
    expect(screen.getByText('Data sesuai.')).toBeInTheDocument()
  })

  it('offers the final approval to Kades and the download menu once issued', () => {
    const { rerender } = renderModal({
      surat: atFinal,
      viewerRole: 'kepala_desa',
      currentUserRole: 'kepala_desa',
      apiRole: 'kepala_desa',
      canDownload: true,
    })

    expect(screen.getByRole('button', { name: 'Setujui & terbitkan' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Unduh surat/ })).toBeNull()

    rerender(
      <SuratDetailModal
        suratId="letter-41"
        onClose={vi.fn()}
        surat={{ ...atFinal, status: 'approved' }}
        notFound={false}
        viewerRole="kepala_desa"
        currentUserRole="kepala_desa"
        apiRole="kepala_desa"
        canDownload
      />,
    )

    expect(screen.queryByRole('button', { name: /Setujui/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Unduh surat/ })).toBeInTheDocument()
  })

  it('shows the rejection reason for a rejected letter', () => {
    renderModal({
      surat: partialFixture<Letter>({
        ...pendingAtRt,
        status: 'rejected',
        rejected_at_step: 1,
        approvals: [
          { id: 2, approval_level: 'rt', action: 'rejected', notes: 'Alamat tidak sesuai.' },
        ],
      }),
      viewerRole: 'rt',
    })

    expect(screen.getByRole('heading', { name: 'Alasan penolakan' })).toBeInTheDocument()
    expect(screen.getAllByText('Alamat tidak sesuai.').length).toBeGreaterThan(0)
  })
})
