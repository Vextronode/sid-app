import { useFieldArray } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

import { roleOptions } from '../utils/familyHead'
import { repeaterMinRows, visibleFields } from '../utils/fieldCondition'
import { OTHER_OCCUPATION, otherOccupationFieldName } from '../validation/suratSchema'
import type { Control, FieldError, FieldErrors, UseFormRegister } from 'react-hook-form'
import type { Occupation } from '@/types'
import type { ApplicantFamilyMember, SuratField, SuratFormValues } from '../types'

type RepeaterCatalogs = { familyMembers: ApplicantFamilyMember[]; occupations: Occupation[] }

// Pilihan yang sudah dipakai baris lain: anggota KK dan Kepala Keluarga.
type TakenChoices = { members: string[]; head: boolean }

// Galat per sub-isian dalam satu baris.
type RowErrors = Record<string, FieldError | undefined>

type SubInputProps = {
  field: SuratField
  name: string
  register: UseFormRegister<SuratFormValues>
  error: FieldError | undefined
  row: SuratFormValues
  catalogs: RepeaterCatalogs
  taken: TakenChoices
}

type RepeaterFieldProps = {
  field: SuratField
  control: Control<SuratFormValues>
  register: UseFormRegister<SuratFormValues>
  rows: SuratFormValues[] | undefined
  errors: FieldErrors<SuratFormValues>
  catalogs?: RepeaterCatalogs
  answers?: SuratFormValues
}

// Atribut input per jenis sub-isian; selain ini input teks biasa.
const INPUT_PROPS: Record<string, InputHTMLAttributes<HTMLInputElement>> = {
  date: { type: 'date' },
  time: { type: 'time' },
  number: { type: 'text', inputMode: 'decimal' },
  nik: { type: 'text', inputMode: 'numeric', maxLength: 16 },
}

function SubInput({ field, name, register, error, row, catalogs, taken }: SubInputProps) {
  const className = `sid-input ${error ? 'sid-input-error' : ''}`
  const selectClass = `sid-select ${error ? 'sid-input-error' : ''}`

  // Satu anggota KK pemohon per baris.
  if (field.type === 'family_member') {
    return (
      <select id={name} {...register(name)} className={selectClass}>
        <option value="">Pilih anggota keluarga...</option>
        {catalogs.familyMembers
          .filter((member) => !taken.members.includes(String(member.id)))
          .map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} ({member.family_role_label})
            </option>
          ))}
      </select>
    )
  }

  // Katalog pekerjaan + "Lainnya" (teks bebas di bawahnya).
  if (field.type === 'occupation') {
    const isOther = row?.[field.name] === OTHER_OCCUPATION

    return (
      <>
        <select id={name} {...register(name)} className={selectClass}>
          <option value="">Pilih...</option>
          {catalogs.occupations.map((occupation) => (
            <option key={occupation.id} value={String(occupation.id)}>
              {occupation.name}
            </option>
          ))}
          <option value={OTHER_OCCUPATION}>Lainnya</option>
        </select>
        <input
          type="text"
          aria-label={`${field.label} (Lainnya)`}
          {...register(otherOccupationFieldName(name))}
          disabled={!isOther}
          maxLength={100}
          placeholder={isOther ? 'Tuliskan pekerjaan' : 'Pilih "Lainnya" untuk menulis pekerjaan'}
          className="sid-input"
        />
      </>
    )
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        id={name}
        {...register(name)}
        placeholder={field.placeholder}
        className={`sid-textarea ${error ? 'sid-input-error' : ''}`}
      />
    )
  }

  if (field.type === 'select') {
    return (
      <select
        id={name}
        {...register(name)}
        className={`sid-select ${error ? 'sid-input-error' : ''}`}
      >
        <option value="">Pilih...</option>
        {roleOptions(field, catalogs.familyMembers, row)
          .filter((option) => !(taken.head && option.value === 'kepala_keluarga'))
          .map((option) => (
            <option key={option.value} value={option.value}>
              {option.label ?? option.value}
            </option>
          ))}
      </select>
    )
  }

  const inputProps = INPUT_PROPS[field.type] ?? { type: 'text' }

  return (
    <input
      id={name}
      {...inputProps}
      {...register(name)}
      placeholder={field.placeholder || (field.type === 'nik' ? '16 digit NIK' : undefined)}
      className={className}
    />
  )
}

/**
 * Isian berulang: satu blok per baris (mis. per anak) dengan tombol Tambah
 * dan Hapus. Sub-isian bersyarat dinilai per baris.
 */
export function RepeaterField({
  field,
  control,
  register,
  rows,
  errors,
  catalogs = { familyMembers: [], occupations: [] },
  answers = {},
}: RepeaterFieldProps) {
  // Nama isian berasal dari konfigurasi jenis surat, jadi tidak dikenal tipe form.
  const { fields: items, append, remove } = useFieldArray({ control, name: field.name as never })
  const itemLabel = field.itemLabel || 'baris'
  const minRows = repeaterMinRows(field)
  const maxRows = field.max ?? 20
  const fieldError = errors[field.name]

  return (
    <div className="sid-repeater">
      {items.map((item, index) => {
        const row = rows?.[index] ?? {}
        const rowErrors = (fieldError as unknown as RowErrors[] | undefined)?.[index] ?? {}
        const others = (rows ?? []).filter((_, other) => other !== index)

        return (
          <fieldset key={item.id} className="sid-repeater-row">
            <legend className="sid-repeater-row-title">
              {itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)} ke-{index + 1}
            </legend>

            {visibleFields(field.fields, row).map((subField) => {
              const name = `${field.name}.${index}.${subField.name}`
              // Anggota yang sudah dipilih di baris lain, dan Kepala Keluarga
              // yang sudah ada di baris lain atau di isian `with` (one_head).
              const taken = {
                members:
                  subField.type === 'family_member'
                    ? others.map((other) => String(other?.[subField.name] ?? '')).filter(Boolean)
                    : [],
                head:
                  field.oneHead?.column === subField.name &&
                  (others.some((other) => other?.[subField.name] === 'kepala_keluarga') ||
                    Boolean(
                      field.oneHead.with && answers?.[field.oneHead.with] === 'kepala_keluarga',
                    )),
              }

              return (
                <div key={subField.name} className="sid-form-group">
                  <label htmlFor={name} className="sid-label">
                    {subField.label}
                    {subField.required && <span className="sid-required"> *</span>}
                  </label>
                  <SubInput
                    field={subField}
                    name={name}
                    register={register}
                    error={rowErrors[subField.name]}
                    row={row}
                    catalogs={catalogs}
                    taken={taken}
                  />
                  {rowErrors[subField.name]?.message && (
                    <span className="sid-form-field-error" role="alert">
                      {rowErrors[subField.name].message}
                    </span>
                  )}
                  {rowErrors[otherOccupationFieldName(subField.name)]?.message && (
                    <span className="sid-form-field-error" role="alert">
                      {rowErrors[otherOccupationFieldName(subField.name)].message}
                    </span>
                  )}
                </div>
              )
            })}

            {items.length > minRows && (
              <button
                type="button"
                className="sid-row-action danger"
                onClick={() => remove(index)}
                aria-label={`Hapus ${itemLabel} ke-${index + 1}`}
              >
                <Trash2 size={15} aria-hidden="true" />
                Hapus
              </button>
            )}
          </fieldset>
        )
      })}

      {items.length < maxRows && (
        <button type="button" className="sid-btn sid-btn-secondary" onClick={() => append({})}>
          <Plus size={16} aria-hidden="true" />
          Tambah {itemLabel}
        </button>
      )}

      {fieldError?.message && (
        <span className="sid-form-field-error" role="alert">
          {fieldError.message}
        </span>
      )}
    </div>
  )
}
