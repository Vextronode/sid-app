import type { ApplicantFamilyMember } from '@/features/surat/types'
import { guardianRelation, guardianRelationLabel } from '../guardianRelation'

/**
 * Penanggung jawab CPMI dari anggota KK: hubungannya dengan pemohon terisi
 * otomatis dari SHDK keduanya, ditampilkan baca-saja (server menetapkan
 * nilai yang sama saat pengajuan).
 */
export function GuardianRelationHint({
  members,
  memberId,
}: {
  members: ApplicantFamilyMember[]
  memberId: string | undefined
}) {
  const member = members.find((item) => String(item.id) === String(memberId ?? ''))
  const self = members.find((item) => item.is_self)

  if (!member) return null

  const relation = guardianRelationLabel(
    guardianRelation(self?.family_role, member.family_role, member.gender),
  )

  return (
    <p className="sid-upload-description" role="status">
      Hubungan dengan Anda (dari data KK): <strong>{relation}</strong>
    </p>
  )
}
