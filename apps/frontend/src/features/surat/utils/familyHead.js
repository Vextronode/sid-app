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
