import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getLetterDetail = vi.hoisted(() => vi.fn())
const revealLetterPayloadIdentity = vi.hoisted(() => vi.fn())

vi.mock('../api/letterExtrasApi', () => ({
  getLetterDetail,
  supportingDocumentUrl: (id: string) => `/api/letters/${id}/supporting-document`,
}))
vi.mock('@/shared/lib/identityApi', () => ({ revealLetterPayloadIdentity }))
vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'rt-1', role: 'rt' } }),
}))
vi.mock('./FulfillmentPanel', () => ({ FulfillmentPanel: (): null => null }))
vi.mock('./LetterResultPanel', () => ({ LetterResultPanel: (): null => null }))

import { partialFixture } from '@/test/fixtures'
import type { Letter } from '@/types'

import { LetterExtrasPanel } from './LetterExtrasPanel'

const LETTER = partialFixture<Letter>({
  id: 'letter-1',
  submitted_by: 'warga-1',
  payload: { nik_ayah: '************0001', nama_ayah: 'Ahmad' },
  masked_payload_paths: ['nik_ayah'],
  letter_type: {
    form_fields: [
      { name: 'nik_ayah', label: 'NIK Ayah', type: 'nik' },
      { name: 'nama_ayah', label: 'Nama Ayah', type: 'text' },
    ],
  },
})

describe('LetterExtrasPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLetterDetail.mockResolvedValue(LETTER)
    revealLetterPayloadIdentity.mockResolvedValue('3207010101700001')
  })

  it('shows masked NIK fields with a logged reveal and other fields as-is', async () => {
    render(<LetterExtrasPanel letterId="letter-1" />)

    expect(await screen.findByText('************0001')).toBeTruthy()
    expect(screen.getByText('Ahmad')).toBeTruthy()
    expect(screen.queryByText('3207010101700001')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan NIK Ayah' }))

    expect(await screen.findByText('3207010101700001')).toBeTruthy()
    expect(revealLetterPayloadIdentity).toHaveBeenCalledWith('letter-1', 'nik_ayah')
  })
})
