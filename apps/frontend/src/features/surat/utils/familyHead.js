/**
 * Isian kepala keluarga baru (requiredWhenHead): tampil hanya bila kepala
 * keluarga termasuk anggota terpilih di isian acuannya (almarhum, atau
 * anggota yang pindah) dan masih ada anggota yang tinggal sebagai calon.
 * Calonnya anggota selain kepala keluarga dan selain yang terpilih.
 *
 * @returns {{ visible: boolean, candidates: Array<object> }}
 */
export function newHeadChoice(field, familyMembers, formData) {
  const leaving = []
    .concat(formData?.[field.requiredWhenHead] ?? [])
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
