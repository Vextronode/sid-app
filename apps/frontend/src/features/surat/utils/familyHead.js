/**
 * Isian kepala keluarga baru (requiredWhenHead): tampil hanya bila kepala
 * keluarga termasuk anggota terpilih di isian acuannya (almarhum, atau
 * anggota yang pindah) dan masih ada anggota yang tinggal sebagai calon.
 * Calonnya anggota selain kepala keluarga dan selain yang terpilih.
 *
 * @returns {{ visible: boolean, candidates: Array<object> }}
 */
export function newHeadChoice(field, familyMembers, formData) {
  // Satu id, daftar id, atau baris repeater dengan kolom `anggota`.
  const leaving = []
    .concat(formData?.[field.requiredWhenHead] ?? [])
    .map((item) => (item && typeof item === 'object' ? item.anggota : item))
    .filter(Boolean)
    .map(String)
  const candidates = familyMembers.filter(
    (member) => member.family_role !== 'kepala_keluarga' && !leaving.includes(String(member.id)),
  )
  const headLeaving = familyMembers.some(
    (member) => leaving.includes(String(member.id)) && member.family_role === 'kepala_keluarga',
  )

  return { visible: headLeaving && candidates.length > 0, candidates }
}

/**
 * Syarat `olderThan` ({ field, years }) isian family_member: anggota minimal
 * sekian tahun lebih tua dari acuan di isian itu (anggota KK terpilih atau
 * tanggal). Tanpa acuan atau tanpa tanggal lahir anggota, tidak disaring.
 */
export function isOldEnough(member, olderThan, familyMembers, formData) {
  const value = olderThan ? formData?.[olderThan.field] : null

  if (!value || !member.date_of_birth) return true

  const reference =
    familyMembers.find((other) => String(other.id) === String(value))?.date_of_birth ?? value
  const latest = new Date(reference)

  if (Number.isNaN(latest.getTime())) return true

  latest.setFullYear(latest.getFullYear() - olderThan.years)

  return new Date(member.date_of_birth) <= latest
}

/**
 * Pilihan isian family_member: anggota KK (atau calon kepala keluarga baru)
 * yang lolos syarat jenis kelamin, hubungan dalam KK, selisih usia, dan
 * bukan pemohon bila `notSelf`.
 */
export function memberChoices(field, familyMembers, formData, headChoice = null) {
  return (headChoice?.candidates ?? familyMembers)
    .filter((member) => !field.gender || member.gender === field.gender)
    .filter((member) => !field.roles || field.roles.includes(member.family_role))
    .filter((member) => isOldEnough(member, field.olderThan, familyMembers, formData))
    .filter((member) => !field.notSelf || !member.is_self)
}

/**
 * Kepala Keluarga sudah dipilih di repeater ber-`oneHead` yang `with`-nya
 * isian ini (mis. SHDK pasangan saat salah satu anggota sudah kepala
 * keluarga KK baru).
 */
export function headTakenBy(fieldName, fields, formData) {
  return fields.some(
    (field) =>
      field.oneHead?.with === fieldName &&
      (formData?.[field.name] ?? []).some(
        (row) => row?.[field.oneHead.column] === 'kepala_keluarga',
      ),
  )
}

/**
 * Pilihan SHDK isian ber-`roleOf`: Suami hanya untuk laki-laki dan Istri
 * hanya untuk perempuan, menurut jenis kelamin orang di acuannya (anggota KK
 * terpilih, isian jenis kelamin L/P, atau `family_head`). Bila jenis
 * kelaminnya belum diketahui (mis. NIK warga lain), semua pilihan tampil dan
 * diperiksa server.
 */
export function roleOptions(field, familyMembers, answers) {
  if (!field.roleOf) return field.options

  const value = answers?.[field.roleOf]
  const gender =
    field.roleOf === 'family_head'
      ? familyMembers.find((member) => member.family_role === 'kepala_keluarga')?.gender
      : ['L', 'P'].includes(value)
        ? value
        : familyMembers.find((member) => String(member.id) === String(value))?.gender

  return field.options.filter(
    (option) =>
      !gender ||
      !(
        (option.value === 'suami' && gender !== 'L') ||
        (option.value === 'istri' && gender !== 'P')
      ),
  )
}
