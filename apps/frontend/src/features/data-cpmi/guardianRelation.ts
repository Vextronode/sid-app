// Hubungan penanggung jawab CPMI dari anggota KK dengan pemohon, sama
// dengan App\Support\GuardianRelation di backend (yang menentukan nilai
// tersimpan). Di sini hanya untuk ditampilkan sebelum pengajuan dikirim.

export const GUARDIAN_RELATION_LABELS: Record<string, string> = {
  suami: 'Suami',
  istri: 'Istri',
  ayah: 'Ayah',
  ibu: 'Ibu',
  saudara: 'Saudara Kandung',
  wali: 'Wali Lainnya',
  anak: 'Anak',
  mertua: 'Mertua',
  menantu: 'Menantu',
  cucu: 'Cucu',
  kakek_nenek: 'Kakek/Nenek',
  famili_lain: 'Famili Lain',
}

const COUPLE = ['kepala_keluarga', 'suami', 'istri']

export function guardianRelation(
  applicantRole: string | null | undefined,
  memberRole: string | null | undefined,
  memberGender: string | null | undefined,
): string {
  const byGender = (male: string, female: string) =>
    memberGender === 'L' ? male : memberGender === 'P' ? female : 'famili_lain'
  const applicantInCouple = COUPLE.includes(applicantRole ?? '')
  const memberInCouple = COUPLE.includes(memberRole ?? '')

  if (applicantInCouple) {
    if (memberInCouple) return byGender('suami', 'istri')
    if (memberRole === 'anak') return 'anak'
    if (memberRole === 'menantu') return 'menantu'
    if (memberRole === 'cucu') return 'cucu'
    if (memberRole === 'orang_tua')
      return applicantRole === 'kepala_keluarga' ? byGender('ayah', 'ibu') : 'mertua'
    if (memberRole === 'mertua')
      return applicantRole === 'kepala_keluarga' ? 'mertua' : byGender('ayah', 'ibu')

    return 'famili_lain'
  }

  if (applicantRole === 'anak') {
    if (memberInCouple) return byGender('ayah', 'ibu')
    if (memberRole === 'anak') return 'saudara'
    if (memberRole === 'orang_tua' || memberRole === 'mertua') return 'kakek_nenek'

    return 'famili_lain'
  }

  if (applicantRole === 'orang_tua' && memberRole === 'kepala_keluarga') return 'anak'
  if (applicantRole === 'cucu' && memberInCouple) return 'kakek_nenek'

  return 'famili_lain'
}

export function guardianRelationLabel(relation: string | null | undefined) {
  return relation ? (GUARDIAN_RELATION_LABELS[relation] ?? relation) : null
}
