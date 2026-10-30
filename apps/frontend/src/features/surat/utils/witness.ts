/**
 * Pesan bila NIK saksi tidak boleh dipakai: milik pemohon sendiri (hasil
 * pencarian NIK), atau sama dengan isian NIK lain di `notSameAs` (saksi
 * lainnya, pihak dalam surat). Null bila boleh.
 */
export function witnessConflict(field, fields, formData, lookup) {
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
