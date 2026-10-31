import type { NikLookupResult } from '../components/NikLookupHint'
import type { SuratField, SuratFormValues } from '../types'

/**
 * Pesan bila NIK saksi tidak boleh dipakai: milik pemohon sendiri (hasil
 * pencarian NIK), atau sama dengan isian NIK lain di `notSameAs` (saksi
 * lainnya, pihak dalam surat). Null bila boleh.
 */
export function witnessConflict(
  field: Pick<SuratField, 'name' | 'notSameAs'>,
  fields: Pick<SuratField, 'name' | 'label'>[],
  formData: SuratFormValues | undefined,
  lookup: Pick<NikLookupResult, 'isSelf'> | null | undefined,
): string | null {
  const nik = formData?.[field.name]

  if (lookup?.isSelf) {
    return 'Ini NIK Anda sendiri. Saksi harus orang lain.'
  }

  const other = (field.notSameAs ?? []).find((name) => nik && formData?.[name] === nik)

  if (other) {
    const label = fields.find((item) => item.name === other)?.label ?? other

    return `NIK ini sudah diisi sebagai ${label}. Saksi harus orang lain.`
  }

  return null
}
