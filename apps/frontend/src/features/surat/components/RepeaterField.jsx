import { useFieldArray } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'

import { repeaterMinRows, visibleFields } from '../utils/fieldCondition'

function SubInput({ field, name, register, error }) {
  const className = `sid-input ${error ? 'sid-input-error' : ''}`

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
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label ?? option.value}
          </option>
        ))}
      </select>
    )
  }

  const inputProps = {
    date: { type: 'date' },
    number: { type: 'text', inputMode: 'decimal' },
    nik: { type: 'text', inputMode: 'numeric', maxLength: 16 },
  }[field.type] ?? { type: 'text' }

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
export function RepeaterField({ field, control, register, rows, errors }) {
  const { fields: items, append, remove } = useFieldArray({ control, name: field.name })
  const itemLabel = field.itemLabel || 'baris'
  const minRows = repeaterMinRows(field)
  const maxRows = field.max ?? 20
  const fieldError = errors[field.name]

  return (
    <div className="sid-repeater">
      {items.map((item, index) => {
        const row = rows?.[index] ?? {}
        const rowErrors = fieldError?.[index] ?? {}

        return (
          <fieldset key={item.id} className="sid-repeater-row">
            <legend className="sid-repeater-row-title">
              {itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)} ke-{index + 1}
            </legend>

            {visibleFields(field.fields, row).map((subField) => {
              const name = `${field.name}.${index}.${subField.name}`

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
                  />
                  {rowErrors[subField.name]?.message && (
                    <span className="sid-form-field-error" role="alert">
                      {rowErrors[subField.name].message}
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
