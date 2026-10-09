import { describe, expect, it } from 'vitest'
import { getLetterTypeFormConfig } from './letterTypeConfig'

describe('getLetterTypeFormConfig', () => {
  it('uses backend type metadata with the matching frontend field schema', () => {
    const config = getLetterTypeFormConfig({
      id: 12,
      code: 'A04',
      name: 'Nama jenis surat dari API',
      verification_type: 'document',
      requirements_info: 'Dokumen pendukung',
      category: { id: 3, name: 'Administrasi' },
    })

    expect(config).toMatchObject({
      id: 12,
      code: 'A04',
      title: 'Nama jenis surat dari API',
      type: 'document',
      requirementsInfo: 'Dokumen pendukung',
      category: { id: 3, name: 'Administrasi' },
    })
    expect(config.fields).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'keperluan' })]))
  })

  it('returns null when the FE has no field schema for a backend type', () => {
    expect(getLetterTypeFormConfig({ id: 20, code: 'NEW', name: 'Jenis baru' })).toBeNull()
  })
})
