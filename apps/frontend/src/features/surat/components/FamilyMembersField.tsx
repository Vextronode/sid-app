import { RevealableValue } from '@/components/ui/RevealableValue'
import { revealCitizenNik } from '@/shared/lib/identityApi'

/**
 * Pilih anggota KK pemohon (centang). Daftar anggota diambil dari
 * GET /profile/family-members; backend memvalidasi ulang pilihannya.
 */
export function FamilyMembersField({ field, members, loadFailed, value, setValue, errors }) {
  const selected = Array.isArray(value) ? value : []

  const toggle = (id) => {
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]

    setValue(field.name, next, { shouldValidate: Boolean(errors[field.name]), shouldDirty: true })
  }

  if (loadFailed) {
    return (
      <p className="sid-admin-alert sid-admin-alert-error" role="alert">
        Daftar anggota keluarga gagal dimuat. Muat ulang halaman lalu coba lagi.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={field.label}>
      {members.map((member) => (
        <label key={member.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected.includes(member.id)}
            onChange={() => toggle(member.id)}
          />
          <span>
            {member.name}
            {member.is_self ? ' (Anda)' : ''} - {member.family_role_label}
            {member.nik_masked && (
              <>
                , NIK{' '}
                <RevealableValue
                  masked={member.nik_masked}
                  reveal={() => revealCitizenNik(member.id)}
                />
              </>
            )}
          </span>
        </label>
      ))}

      {errors[field.name]?.message && (
        <span className="sid-form-field-error" role="alert">
          {errors[field.name].message}
        </span>
      )}
    </div>
  )
}
