import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/contexts/AuthContext'

import { getSuratSchema, signerFieldNames } from '../validation/suratSchema'
import { buildLetterFormData } from '../utils/letterFormData'
import { getMySignature } from '../api/signatureApi'

import { CheckCircle2, ChevronDown } from 'lucide-react'

import { useSubmitSurat } from '../hooks/useSubmitSurat'

import { AutoFillProfile } from './AutoFillProfile'
import { FileUploader } from './FileUploader'

const WET_FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png'

function firstServerError(error) {
  const errors = error?.response?.data?.errors

  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0]

    if (first) return first
  }

  return error?.response?.data?.message ?? 'Gagal mengirim surat.'
}

export function DynamicSuratForm({
  config,
  onCancel,
  onSubmit,
  initialData = {},
  onSubmitAPI = null,
  letterTypes = [],
  onSelectType = null,
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState('')
  const [hasSignature, setHasSignature] = useState(null)

  const signatureSlots = config.signatureSlots ?? []
  const applicantSlots = signatureSlots.filter((slot) => slot.signer === 'applicant')
  const otherSlots = signatureSlots.filter((slot) => slot.signer === 'other')
  const needsOwnSignature = applicantSlots.length > 0

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(getSuratSchema(config)),
    defaultValues: {
      ...Object.fromEntries(otherSlots.map((slot) => [signerFieldNames(slot.key).mode, 'digital'])),
      ...initialData,
    },
    mode: 'onSubmit',
  })

  const watchedFormData = useWatch({
    control,
  })

  const { handleSubmit: submitSurat, loading } = useSubmitSurat()

  useEffect(() => {
    if (!needsOwnSignature) return undefined

    let active = true

    getMySignature()
      .then((signature) => {
        if (active) setHasSignature(Boolean(signature?.has_signature))
      })
      .catch(() => {
        if (active) setHasSignature(null)
      })

    return () => {
      active = false
    }
  }, [needsOwnSignature])

  const handleFileChange = (e, name, multiple = true) => {
    const files = Array.from(e.target.files || [])

    if (!files.length) {
      return
    }

    const currentFiles = watchedFormData?.[name] || []

    setValue(name, multiple ? [...currentFiles, ...files] : [files[0]], {
      shouldValidate: true,
      shouldDirty: true,
    })

    e.target.value = ''
  }

  const handleRemoveFile = (e, name, index) => {
    e.stopPropagation()

    const currentFiles = watchedFormData?.[name] || []
    const updatedFiles = [...currentFiles]

    updatedFiles.splice(index, 1)

    setValue(name, updatedFiles, {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  const handleFormSubmit = async (formData) => {
    const selectedLetterType =
      letterTypes.find((item) => item.code === config.code) ??
      (config.id ? { id: config.id } : null)

    if (!selectedLetterType) {
      setSubmitError('Jenis surat tidak ditemukan.')
      return
    }

    setSubmitError('')

    const payload = buildLetterFormData(config, selectedLetterType.id, formData)

    try {
      let response

      if (onSubmitAPI) {
        response = await onSubmitAPI(payload)
      } else {
        response = await submitSurat(payload)
      }

      onSubmit?.(response)
    } catch (error) {
      console.error(error)

      setSubmitError(firstServerError(error))
    }
  }

  const renderError = (name) =>
    errors[name]?.message ? (
      <span className="sid-form-field-error" role="alert">
        {errors[name].message}
      </span>
    ) : null

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="sid-card w-full" noValidate>
      <section className="sid-section">
        <h3 className="sid-section-title">Langkah 1 - Pilih Jenis Surat</h3>

        <div className="sid-form-group">
          <label className="sid-label">
            Jenis surat <span className="sid-required">*</span>
          </label>

          <div className="relative">
            <select
              value={config.code}
              onChange={(e) =>
                onSelectType
                  ? onSelectType(e.target.value)
                  : navigate(`/pengajuan-surat/${e.target.value}`)
              }
              className="sid-select appearance-none pr-10"
            >
              {(letterTypes.some((item) => item.code === config.code)
                ? letterTypes
                : [{ id: config.id, code: config.code, name: config.title }]
              ).map((letterType) => (
                <option key={letterType.id} value={letterType.code}>
                  {letterType.name}
                </option>
              ))}
            </select>

            <ChevronDown
              size={18}
              className="
                absolute
                right-3
                top-1/2
                -translate-y-1/2
                pointer-events-none
              "
              style={{
                color: 'var(--sid-primary)',
              }}
            />
          </div>
        </div>

        <div className="sid-info">
          <CheckCircle2 size={16} />

          <span>
            Verifikasi: <strong>{config.type}</strong>
          </span>
        </div>
      </section>

      <section className="sid-section">
        <h3 className="sid-section-title">Langkah 2 - Isi Form</h3>

        <AutoFillProfile user={user} />

        <div
          className="
            flex
            flex-col
            gap-4
            pt-4
            border-t
          "
          style={{
            borderColor: 'var(--sid-border)',
          }}
        >
          {config.fields.map((field) => {
            const fieldError = errors[field.name]
            const inputClass = `sid-input ${fieldError ? 'sid-input-error' : ''}`

            return (
              <div key={field.name} className="sid-form-group">
                <label htmlFor={field.name} className="sid-label">
                  {field.label}

                  {field.required && <span className="sid-required"> *</span>}
                </label>

                {field.type === 'textarea' && (
                  <textarea
                    id={field.name}
                    {...register(field.name)}
                    placeholder={field.placeholder}
                    className={`sid-textarea ${fieldError ? 'sid-input-error' : ''}`}
                  />
                )}

                {field.type === 'text' && (
                  <input
                    id={field.name}
                    type="text"
                    {...register(field.name)}
                    placeholder={field.placeholder}
                    className={inputClass}
                  />
                )}

                {field.type === 'nik' && (
                  <input
                    id={field.name}
                    type="text"
                    inputMode="numeric"
                    maxLength={16}
                    {...register(field.name)}
                    placeholder={field.placeholder || '16 digit NIK'}
                    className={inputClass}
                  />
                )}

                {field.type === 'number' && (
                  <input
                    id={field.name}
                    type="text"
                    inputMode="decimal"
                    {...register(field.name)}
                    placeholder={field.placeholder}
                    className={inputClass}
                  />
                )}

                {field.type === 'date' && (
                  <input
                    id={field.name}
                    type="date"
                    {...register(field.name)}
                    className={inputClass}
                  />
                )}

                {field.type === 'select' && (
                  <select
                    id={field.name}
                    {...register(field.name)}
                    className={`sid-select ${fieldError ? 'sid-input-error' : ''}`}
                  >
                    <option value="">Pilih...</option>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label ?? option.value}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === 'file' && (
                  <FileUploader
                    field={field}
                    files={watchedFormData?.[field.name] || []}
                    onFileChange={(e, name) => handleFileChange(e, name, field.multiple)}
                    onRemoveFile={handleRemoveFile}
                  />
                )}

                {renderError(field.name)}
              </div>
            )
          })}
        </div>
      </section>

      {signatureSlots.length > 0 && (
        <section className="sid-section">
          <h3 className="sid-section-title">Langkah 3 - Tanda Tangan</h3>

          <div className="flex flex-col gap-4">
            {applicantSlots.map((slot) => (
              <div key={slot.key} className="sid-form-group">
                <span className="sid-label">{slot.label}</span>

                {hasSignature === false ? (
                  <p className="sid-form-field-error" role="alert">
                    Anda belum memiliki tanda tangan. <Link to="/profile">Buat tanda tangan</Link>{' '}
                    terlebih dahulu sebelum mengajukan surat ini.
                  </p>
                ) : (
                  <p className="sid-info">
                    <CheckCircle2 size={16} />
                    <span>Memakai tanda tangan yang tersimpan di akun Anda.</span>
                  </p>
                )}
              </div>
            ))}

            {otherSlots.map((slot) => {
              const names = signerFieldNames(slot.key)
              const mode = watchedFormData?.[names.mode] ?? 'digital'

              return (
                <fieldset key={slot.key} className="sid-form-group">
                  <legend className="sid-label">
                    {slot.label} <span className="sid-required">*</span>
                  </legend>

                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2">
                      <input type="radio" value="digital" {...register(names.mode)} />
                      <span>Minta tanda tangan digital lewat NIK</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" value="wet" {...register(names.mode)} />
                      <span>Unggah dokumen ber-tanda tangan basah (tidak punya akun)</span>
                    </label>
                  </div>

                  {mode === 'digital' ? (
                    <>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={16}
                        aria-label={`NIK ${slot.label}`}
                        {...register(names.nik)}
                        placeholder={`NIK ${slot.label} (16 digit)`}
                        className={`sid-input ${errors[names.nik] ? 'sid-input-error' : ''}`}
                      />
                      <p className="sid-upload-description">
                        Pemilik NIK akan menerima permintaan dan dapat menyetujui atau menolaknya.
                        Surat baru diproses setelah disetujui.
                      </p>
                      {renderError(names.nik)}
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        aria-label={`Nama ${slot.label}`}
                        {...register(names.name)}
                        placeholder={`Nama lengkap ${slot.label}`}
                        className={`sid-input ${errors[names.name] ? 'sid-input-error' : ''}`}
                      />
                      {renderError(names.name)}
                      <FileUploader
                        field={{ name: names.file, accept: WET_FILE_ACCEPT, multiple: false }}
                        files={watchedFormData?.[names.file] || []}
                        onFileChange={(e, name) => handleFileChange(e, name, false)}
                        onRemoveFile={handleRemoveFile}
                      />
                      {renderError(names.file)}
                    </>
                  )}
                </fieldset>
              )
            })}
          </div>
        </section>
      )}

      {submitError && (
        <p className="sid-form-field-error" role="alert">
          {submitError}
        </p>
      )}

      <div
        className="sid-actions pt-4 border-t"
        style={{
          borderColor: 'var(--sid-border)',
        }}
      >
        <button type="button" onClick={onCancel} className="sid-btn sid-btn-secondary">
          Batal
        </button>

        <button
          type="submit"
          disabled={loading || (needsOwnSignature && hasSignature === false)}
          className="sid-btn sid-btn-primary"
        >
          {loading ? 'Mengirim...' : 'Kirim'}
        </button>
      </div>
    </form>
  )
}
