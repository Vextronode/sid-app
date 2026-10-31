import type { ChangeEvent, ReactNode } from 'react'
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form'

import { OTHER_OCCUPATION, otherOccupationFieldName } from '../validation/suratSchema'
import type { Occupation } from '@/types'
import type { SuratField, SuratFormValues } from '../types'

type OccupationFieldProps = {
  field: SuratField
  register: UseFormRegister<SuratFormValues>
  setValue: UseFormSetValue<SuratFormValues>
  value: unknown
  occupations: Occupation[]
  loadFailed: boolean
  errors: FieldErrors<SuratFormValues>
  renderError: (name: string) => ReactNode
}

/**
 * Isian pekerjaan: pilihan dari katalog pekerjaan desa, plus "Lainnya"
 * yang membuka kolom teks di bawahnya. Teks Lainnya hanya dicetak di
 * surat (backend merapikan penulisannya).
 */
export function OccupationField({
  field,
  register,
  setValue,
  value,
  occupations,
  loadFailed,
  errors,
  renderError,
}: OccupationFieldProps) {
  const otherName = otherOccupationFieldName(field.name)
  const isOther = value === OTHER_OCCUPATION
  const selectField = register(field.name)

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    selectField.onChange(event)

    // Teks Lainnya dikosongkan begitu pilihan beralih ke katalog.
    if (event.target.value !== OTHER_OCCUPATION) {
      setValue(otherName, '', { shouldValidate: Boolean(errors[otherName]) })
    }
  }

  return (
    <>
      <select
        id={field.name}
        {...selectField}
        onChange={handleChange}
        className={`sid-select ${errors[field.name] ? 'sid-input-error' : ''}`}
      >
        <option value="">Pilih...</option>
        {occupations.map((occupation) => (
          <option key={occupation.id} value={String(occupation.id)}>
            {occupation.name}
          </option>
        ))}
        <option value={OTHER_OCCUPATION}>Lainnya</option>
      </select>

      {loadFailed && (
        <p className="sid-upload-description">
          Daftar pekerjaan gagal dimuat. Pilih Lainnya lalu tuliskan pekerjaannya.
        </p>
      )}

      {renderError(field.name)}

      <input
        id={otherName}
        type="text"
        aria-label={`${field.label} (Lainnya)`}
        {...register(otherName)}
        disabled={!isOther}
        maxLength={100}
        placeholder={isOther ? 'Tuliskan pekerjaan' : 'Pilih "Lainnya" untuk menulis pekerjaan'}
        className={`sid-input ${errors[otherName] ? 'sid-input-error' : ''}`}
      />

      {renderError(otherName)}
    </>
  )
}
