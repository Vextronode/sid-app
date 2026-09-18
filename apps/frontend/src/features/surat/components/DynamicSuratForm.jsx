import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/contexts/AuthContext'

import { LIST_SURAT_GLOBAL } from '@/lib/constants/suratList'
import { getSuratSchema } from '../validation/suratSchema'

import { CheckCircle2, ChevronDown } from 'lucide-react'

import { useSubmitSurat } from '../hooks/useSubmitSurat'
import { useLetterTypes } from '../hooks/useLetterTypes'

import { AutoFillProfile } from './AutoFillProfile'
import { FileUploader } from './FileUploader'

export function DynamicSuratForm({
  config,
  onCancel,
  onSubmit,
  initialData = {},
  onSubmitAPI = null,
}) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(getSuratSchema(config)),
    defaultValues: initialData,
    mode: 'onSubmit',
  })

  const watchedFormData = useWatch({
    control,
  })

  const { handleSubmit: submitSurat, loading } = useSubmitSurat()

  const letterTypes = useLetterTypes()

  const handleFileChange = (e, name) => {
    const files = Array.from(e.target.files || [])

    if (!files.length) {
      return
    }

    const currentFiles = watchedFormData?.[name] || []

    setValue(name, [...currentFiles, ...files], {
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
    if (!Array.isArray(letterTypes) || letterTypes.length === 0) {
      alert('Jenis surat masih dimuat.')
      return
    }

    const selectedLetterType = letterTypes.find((item) => item.code === config.code)

    if (!selectedLetterType) {
      alert('Jenis surat tidak ditemukan.')
      return
    }

    const payload = new FormData()

    payload.append('letter_type_id', selectedLetterType.id)

    if (formData.keperluan) {
      payload.append('purpose', formData.keperluan)
    }

    if (formData.catatan) {
      payload.append('notes', formData.catatan)
    }

    if (Array.isArray(formData.dokumen)) {
      formData.dokumen.forEach((file) => {
        payload.append('attachments[]', file)
      })
    }

    Object.keys(formData).forEach((key) => {
      if (!['keperluan', 'catatan', 'dokumen'].includes(key)) {
        const value = formData[key]

        if (
          value !== undefined &&
          value !== null &&
          !(value instanceof File) &&
          !Array.isArray(value)
        ) {
          payload.append(`payload[${key}]`, value)
        }
      }
    })

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

      alert(error.response?.data?.message ?? 'Gagal mengirim surat.')
    }
  }

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
              onChange={(e) => navigate(`/pengajuan-surat/${e.target.value}`)}
              className="sid-select appearance-none pr-10"
            >
              {LIST_SURAT_GLOBAL.map((surat) => (
                <option key={surat.code} value={surat.code}>
                  {surat.name}
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
                    className={`sid-input ${fieldError ? 'sid-input-error' : ''}`}
                  />
                )}

                {field.type === 'date' && (
                  <input
                    id={field.name}
                    type="date"
                    {...register(field.name)}
                    className={`sid-input ${fieldError ? 'sid-input-error' : ''}`}
                  />
                )}

                {field.type === 'file' && (
                  <FileUploader
                    field={field}
                    files={watchedFormData?.[field.name] || []}
                    onFileChange={handleFileChange}
                    onRemoveFile={handleRemoveFile}
                  />
                )}

                {fieldError?.message && (
                  <span className="sid-form-field-error" role="alert">
                    {fieldError.message}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <div
        className="sid-actions pt-4 border-t"
        style={{
          borderColor: 'var(--sid-border)',
        }}
      >
        <button type="button" onClick={onCancel} className="sid-btn sid-btn-secondary">
          Batal
        </button>

        <button type="submit" disabled={loading} className="sid-btn sid-btn-primary">
          {loading ? 'Mengirim...' : 'Kirim'}
        </button>
      </div>
    </form>
  )
}
