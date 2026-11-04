import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImportPreviewSummary } from './ImportPreviewSummary'
import type { CitizenImportPreview } from '../hooks/useWargaList'

function makePreview(overrides: Partial<CitizenImportPreview> = {}): CitizenImportPreview {
  return {
    token: 'token-1',
    expires_at: '2026-11-04T10:00:00+07:00',
    total_rows: 6,
    new_count: 3,
    conflict_count: 1,
    error_count: 1,
    errors: [{ row: 7, message: 'RT 9 tidak ditemukan di RW 001.' }],
    warning_count: 1,
    warnings: [{ row: 4, message: 'Agama "KEPERCAYAAN" tidak dikenali; kolom ini dikosongkan.' }],
    conflicts: [],
    columns: {
      sheet: 'PEMUTAKHIRAN',
      header_row: 8,
      mapped: [
        { column: 'D', header: 'NIK', field: 'nik', label: 'NIK' },
        { column: 'E', header: 'NAMA LENGKAP', field: 'name', label: 'Nama' },
      ],
      ignored: [
        { column: 'A', header: 'NO', reason: 'Tidak dikenali.' },
        { column: 'P', header: 'Agama Warga', reason: 'Tidak dikenali.', suggestion: 'Agama' },
        { column: 'N', header: 'IBU', reason: 'Kolom Nama Ibu sudah diambil dari kolom M.' },
      ],
      missing_required: [],
    },
    ...overrides,
  }
}

function renderSummary(preview: CitizenImportPreview) {
  const onBack = vi.fn()
  const onContinue = vi.fn()
  render(
    <ImportPreviewSummary
      preview={preview}
      fileName="data-warga.xlsx"
      onBack={onBack}
      onContinue={onContinue}
    />,
  )

  return { onBack, onContinue }
}

describe('ImportPreviewSummary', () => {
  it('shows counts, column mapping, and row messages', () => {
    renderSummary(makePreview())

    expect(screen.getByText(/sheet “PEMUTAKHIRAN”, judul kolom di baris 8/)).toBeTruthy()
    expect(screen.getByText('Warga baru').nextElementSibling?.textContent).toBe('3')
    expect(screen.getByText('Peringatan').nextElementSibling?.textContent).toBe('1')

    const read = screen.getByRole('heading', { name: 'Kolom yang dibaca (2)' }).parentElement!
    // Nama sama dengan label: tanpa panah; beda nama: "NAMA LENGKAP -> Nama".
    expect(within(read).getByText('NAMA LENGKAP').parentElement?.textContent).toBe(
      'ENAMA LENGKAPNama',
    )
    expect(within(read).getByText('NIK').parentElement?.textContent).toBe('DNIK')

    const ignored = screen.getByRole('heading', { name: 'Kolom yang diabaikan (3)' }).parentElement!
    expect(within(ignored).getByText('Kolom Nama Ibu sudah diambil dari kolom M.')).toBeTruthy()
    // Saran hanya petunjuk untuk kolom yang tidak dikenali.
    expect(within(ignored).getByText('Agama Warga').parentElement?.textContent).toContain(
      'mungkin maksudnya Agama?',
    )

    expect(screen.getByText('Baris gagal (1)')).toBeTruthy()
    expect(screen.getByText('Peringatan (kolom dikosongkan) (1)')).toBeTruthy()
  })

  it('continues to the overwrite choice when there are conflicts', () => {
    const { onContinue, onBack } = renderSummary(makePreview())

    fireEvent.click(screen.getByRole('button', { name: 'Lanjut: pilih Timpa/Lewati' }))
    expect(onContinue).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Pilih file lain' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('offers a direct import when there are only new citizens', () => {
    renderSummary(makePreview({ conflict_count: 0 }))

    expect(screen.getByRole('button', { name: 'Impor 3 warga baru' })).toBeTruthy()
  })

  it('warns about missing required columns and blocks the import', () => {
    const { onContinue } = renderSummary(
      makePreview({
        new_count: 0,
        conflict_count: 0,
        columns: { ...makePreview().columns, missing_required: ['Jenis Kelamin', 'RT dan RW'] },
      }),
    )

    expect(screen.getByRole('alert').textContent).toContain('Jenis Kelamin, RT dan RW')
    const button = screen.getByRole('button', { name: 'Tidak ada yang bisa diimpor' })
    expect(button.hasAttribute('disabled')).toBe(true)
    fireEvent.click(button)
    expect(onContinue).not.toHaveBeenCalled()
  })
})
