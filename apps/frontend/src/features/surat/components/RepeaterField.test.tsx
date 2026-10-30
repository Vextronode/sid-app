import { fireEvent, render, screen } from '@testing-library/react'
import { useForm, useWatch } from 'react-hook-form'
import { describe, expect, it } from 'vitest'

import { RepeaterField } from './RepeaterField'

const field = {
  name: 'anak',
  label: 'Anak',
  type: 'repeater',
  required: true,
  max: 2,
  itemLabel: 'anak',
  fields: [
    { name: 'nama', label: 'Nama Anak', type: 'text', required: true, options: [] },
    {
      name: 'warga',
      label: 'Kewarganegaraan',
      type: 'select',
      required: true,
      options: [
        { value: 'wni', label: 'WNI' },
        { value: 'wna', label: 'WNA' },
      ],
    },
    {
      name: 'paspor',
      label: 'Nomor Paspor',
      type: 'text',
      required: true,
      options: [],
      visibleWhen: { field: 'warga', equals: 'wna' },
    },
  ],
}

function Harness() {
  const { control, register } = useForm({ defaultValues: { anak: [{}] } })
  const rows = useWatch({ control, name: 'anak' })

  return (
    <RepeaterField field={field} control={control} register={register} rows={rows} errors={{}} />
  )
}

describe('RepeaterField', () => {
  it('adds and removes rows within the limits', () => {
    render(<Harness />)

    // Baris minimal (required) tidak dapat dihapus.
    expect(screen.getByText('Anak ke-1')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Hapus anak/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Tambah anak/ }))
    expect(screen.getByText('Anak ke-2')).toBeTruthy()
    // Batas maksimal tercapai.
    expect(screen.queryByRole('button', { name: /Tambah anak/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Hapus anak ke-2' }))
    expect(screen.queryByText('Anak ke-2')).toBeNull()
  })

  it('shows a conditional sub-field only for the row that meets it', () => {
    render(<Harness />)

    expect(screen.queryByLabelText(/Nomor Paspor/)).toBeNull()
    fireEvent.change(screen.getByLabelText(/Kewarganegaraan/), { target: { value: 'wna' } })
    expect(screen.getByLabelText(/Nomor Paspor/)).toBeTruthy()
  })

  it('hides members and the Kepala Keluarga already chosen in another row', () => {
    const familyField = {
      name: 'susunan_baru',
      label: 'Anggota',
      type: 'repeater',
      required: true,
      max: 3,
      itemLabel: 'anggota',
      oneHead: { column: 'shdk', with: 'shdk_pasangan' },
      fields: [
        {
          name: 'anggota',
          label: 'Anggota Keluarga',
          type: 'family_member',
          required: true,
          options: [],
        },
        {
          name: 'shdk',
          label: 'Hubungan dalam KK Baru',
          type: 'select',
          required: true,
          options: [
            { value: 'kepala_keluarga', label: 'Kepala Keluarga' },
            { value: 'anak', label: 'Anak' },
          ],
        },
      ],
    }
    const familyMembers = [
      { id: 'c-1', name: 'Engkos', family_role_label: 'Kepala Keluarga' },
      { id: 'c-2', name: 'Asti', family_role_label: 'Anak' },
    ]

    function FamilyHarness() {
      const { control, register } = useForm({
        defaultValues: { susunan_baru: [{ anggota: 'c-1', shdk: 'kepala_keluarga' }, {}] },
      })
      const rows = useWatch({ control, name: 'susunan_baru' })

      return (
        <RepeaterField
          field={familyField}
          control={control}
          register={register}
          rows={rows}
          errors={{}}
          catalogs={{ familyMembers, occupations: [] }}
        />
      )
    }

    render(<FamilyHarness />)

    const second = (id: string) =>
      document.getElementById(`susunan_baru.1.${id}`) as HTMLSelectElement
    expect([...second('anggota').options].map((option) => option.textContent)).toEqual([
      'Pilih anggota keluarga...',
      'Asti (Anak)',
    ])
    expect([...second('shdk').options].map((option) => option.value)).toEqual(['', 'anak'])
    // Baris pertama tetap bisa memilih Kepala Keluarga.
    expect(
      [...(document.getElementById('susunan_baru.0.shdk') as HTMLSelectElement).options].map(
        (option) => option.value,
      ),
    ).toContain('kepala_keluarga')
  })
})
