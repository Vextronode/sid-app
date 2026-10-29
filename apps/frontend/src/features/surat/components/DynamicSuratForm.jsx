import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/contexts/AuthContext'

import { getSuratSchema, signerFieldNames, todayDate } from '../validation/suratSchema'
import { reportDeadlineWarning } from '../utils/reportDeadline'
import { buildLetterFormData } from '../utils/letterFormData'
import { repeaterMinRows, visibleFields } from '../utils/fieldCondition'
import { getMySignature } from '../api/signatureApi'
import { getFamilyMembers, getVillageAreas } from '../api/letterExtrasApi'
import { getOccupations } from '@/features/pekerjaan/api'

import { CheckCircle2 } from 'lucide-react'

import { useSubmitSurat } from '../hooks/useSubmitSurat'

import { AutoFillProfile } from './AutoFillProfile'
import { FileUploader } from './FileUploader'
import { OccupationField } from './OccupationField'
import { FamilyMembersField } from './FamilyMembersField'
import { RepeaterField } from './RepeaterField'
import { VillageAreaField } from './VillageAreaField'
import { NikLookupHint } from './NikLookupHint'
import { headTakenBy, memberChoices, newHeadChoice, roleOptions } from '../utils/familyHead'
import { witnessConflict } from '../utils/witness'
import { applicantPrefill, applicantValue, applicantValues } from '../utils/letterTypeConfig'

const WET_FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png'

const DEFAULT_HEADINGS = {
  fields: 'Langkah 2 - Isi Form',
  signatures: 'Langkah 3 - Tanda Tangan',
}

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
  headings = DEFAULT_HEADINGS,
  className = '',
}) {
  const { user } = useAuth()
  const [submitError, setSubmitError] = useState('')
  const [hasSignature, setHasSignature] = useState(null)
  // Ref = guard sinkron (double tap / Enter + klik); state hanya untuk tampilan tombol.
  const submittingRef = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const signatureSlots = config.signatureSlots ?? []
  const applicantSlots = signatureSlots.filter((slot) => slot.signer === 'applicant')
  const otherSlots = signatureSlots.filter((slot) => slot.signer === 'other')
  const needsOwnSignature = applicantSlots.length > 0
  // Sub-isian baris repeater juga dapat memakai katalog pekerjaan / anggota KK.
  const usesType = (type) =>
    config.fields.some(
      (field) => field.type === type || (field.fields ?? []).some((sub) => sub.type === type),
    )
  const needsOccupations = usesType('occupation')
  const [occupations, setOccupations] = useState([])
  const [occupationsFailed, setOccupationsFailed] = useState(false)
  const needsFamily = usesType('family_members') || usesType('family_member')
  const [familyMembers, setFamilyMembers] = useState([])
  const [familyFailed, setFamilyFailed] = useState(false)
  const needsAreas = usesType('village_area')
  const [areas, setAreas] = useState([])
  const [areasFailed, setAreasFailed] = useState(false)
  // Hasil pencarian NIK per isian NIK yang berpasangan dengan isian nama.
  const [nikLookups, setNikLookups] = useState({})
  // Isian (nama, No. KK) yang diisi otomatis dari isian NIK ini.
  const lookupFieldsOf = (nikName) => config.fields.filter((field) => field.fromNik === nikName)
  // Isian dari NIK diketik bila NIK tidak ditemukan, atau dikosongkan pada
  // isian NIK ber-typedWhenEmpty (mis. anak angkat yang belum punya NIK).
  const lookupTyped = (nikName) =>
    nikLookups[nikName]?.status === 'not_found' ||
    (Boolean(config.fields.find((field) => field.name === nikName)?.typedWhenEmpty) &&
      !String(watchedFormData?.[nikName] ?? '').trim())

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(getSuratSchema(config)),
    defaultValues: {
      ...Object.fromEntries(otherSlots.map((slot) => [signerFieldNames(slot.key).mode, 'digital'])),
      // Isian berulang langsung menampilkan jumlah baris minimalnya.
      ...Object.fromEntries(
        config.fields
          .filter((field) => field.type === 'repeater')
          .map((field) => [field.name, Array.from({ length: repeaterMinRows(field) }, () => ({}))]),
      ),
      ...Object.fromEntries(
        config.fields
          .filter((field) => field.type === 'family_members')
          .map((field) => [field.name, []]),
      ),
      ...Object.fromEntries(
        config.fields
          .filter((field) => field.defaultValue !== null && field.defaultValue !== undefined)
          .map((field) => [field.name, field.defaultValue]),
      ),
      // Nilai awal dari data penduduk pemohon (mis. pekerjaan, RT).
      ...applicantPrefill(config.fields, user),
      ...initialData,
      // Isian yang diturunkan dari data pemohon (mis. peran suami/istri).
      ...applicantValues(config.fields, user),
    },
    mode: 'onSubmit',
  })

  const watchedFormData = useWatch({
    control,
  })

  const { handleSubmit: submitSurat } = useSubmitSurat()

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

  useEffect(() => {
    if (!needsOccupations) return undefined

    let active = true

    getOccupations()
      .then((response) => {
        if (active) setOccupations(response.data?.data ?? [])
      })
      .catch(() => {
        if (active) setOccupationsFailed(true)
      })

    return () => {
      active = false
    }
  }, [needsOccupations])

  useEffect(() => {
    if (!needsFamily) return undefined

    let active = true

    getFamilyMembers()
      .then((members) => {
        if (active) setFamilyMembers(members ?? [])
      })
      .catch(() => {
        if (active) setFamilyFailed(true)
      })

    return () => {
      active = false
    }
  }, [needsFamily])

  useEffect(() => {
    if (!needsAreas) return undefined

    let active = true

    getVillageAreas()
      .then((tree) => {
        if (active) setAreas(tree ?? [])
      })
      .catch(() => {
        if (active) setAreasFailed(true)
      })

    return () => {
      active = false
    }
  }, [needsAreas])

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
    if (submittingRef.current) return

    const selectedLetterType =
      letterTypes.find((item) => item.code === config.code) ??
      (config.id ? { id: config.id } : null)

    if (!selectedLetterType) {
      setSubmitError('Jenis surat tidak ditemukan.')
      return
    }

    setSubmitError('')

    const payload = buildLetterFormData(config, selectedLetterType.id, formData)

    submittingRef.current = true
    setIsSubmitting(true)

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
      // Galat isian dari server (mis. urutan tanggal) juga tampil di isiannya.
      Object.entries(error?.response?.data?.errors ?? {}).forEach(([key, messages]) => {
        const name = key.startsWith('payload.') ? key.slice('payload.'.length) : null

        if (name && !name.includes('.') && config.fields.some((field) => field.name === name)) {
          setError(name, { type: 'server', message: [].concat(messages)[0] })
        }
      })
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const renderError = (name) =>
    errors[name]?.message ? (
      <span className="sid-form-field-error" role="alert">
        {errors[name].message}
      </span>
    ) : null

  return (
    <form
      onSubmit={(event) => handleSubmit(handleFormSubmit)(event)}
      className={`sid-card w-full ${className}`.trim()}
      noValidate
    >
      <section className="sid-section">
        <h3 className="sid-section-title">{headings.fields}</h3>

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
          {config.fields.length === 0 && (
            <p className="sid-info">
              Jenis surat ini tidak memerlukan isian tambahan. Data di atas diambil dari profil
              Anda.
            </p>
          )}

          {visibleFields(config.fields, watchedFormData ?? {}).map((field) => {
            const fieldError = errors[field.name]
            const inputClass = `sid-input ${fieldError ? 'sid-input-error' : ''}`

            // Diturunkan dari data pemohon: tidak perlu ditanyakan.
            if (applicantValue(field, user) !== null) {
              return null
            }

            // Nama dari NIK: diketik hanya bila NIK tidak ada di data penduduk.
            if (field.fromNik && !lookupTyped(field.fromNik)) {
              return null
            }

            // Kepala keluarga baru: hanya bila kepala keluarga ikut keluar
            // (almarhum/pindah) dan masih ada anggota yang tinggal.
            const headChoice = field.requiredWhenHead
              ? newHeadChoice(field, familyMembers, watchedFormData)
              : null

            if (headChoice && !headChoice.visible) {
              return null
            }

            // Tanggal peristiwa melewati batas pelaporan: peringatan, tidak memblokir.
            const deadlineWarning =
              field.type === 'date'
                ? reportDeadlineWarning(field, watchedFormData?.[field.name], watchedFormData ?? {})
                : null

            return (
              <div key={field.name} className="sid-form-group">
                <label htmlFor={field.name} className="sid-label">
                  {field.label}

                  {(field.required || field.requiredWhenHead) && (
                    <span className="sid-required"> *</span>
                  )}
                </label>

                {field.help && <p className="sid-upload-description">{field.help}</p>}

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

                {field.type === 'nik' && lookupFieldsOf(field.name).length > 0 && (
                  <NikLookupHint
                    nik={watchedFormData?.[field.name]}
                    witness={field.witness}
                    includeInactive={field.includeInactive}
                    conflict={
                      field.witness
                        ? (lookup) => witnessConflict(field, config.fields, watchedFormData, lookup)
                        : null
                    }
                    onResult={(result) => {
                      setNikLookups((current) =>
                        current[field.name]?.status === result.status &&
                        current[field.name]?.name === result.name
                          ? current
                          : { ...current, [field.name]: result },
                      )
                      // Isi dari data penduduk; dikosongkan bila NIK berubah.
                      lookupFieldsOf(field.name).forEach((target) => {
                        // Pekerjaan/alamat warga desa diisi server saat pengajuan.
                        if (!['name', 'family_number'].includes(target.fromNikValue)) return

                        const found =
                          target.fromNikValue === 'family_number'
                            ? result.familyNumber
                            : result.name

                        if (result.status === 'found') {
                          setValue(target.name, found ?? '', {
                            shouldValidate: Boolean(errors[target.name]),
                          })
                        } else if (nikLookups[field.name]?.status === 'found') {
                          setValue(target.name, '')
                        }
                      })
                    }}
                  />
                )}

                {/* Galat isian yang diisi dari NIK (tersembunyi) tampil di bawah NIK;
                    hanya yang memang galat, agar jarak antarisian tetap sama. */}
                {field.type === 'nik' &&
                  !lookupTyped(field.name) &&
                  lookupFieldsOf(field.name)
                    .filter((target) => errors[target.name]?.message)
                    .map((target) => <span key={target.name}>{renderError(target.name)}</span>)}

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
                    max={field.past ? todayDate() : undefined}
                    {...register(field.name)}
                    className={inputClass}
                  />
                )}

                {deadlineWarning && (
                  <p className="sid-warning-box" role="status">
                    {deadlineWarning}
                  </p>
                )}

                {field.type === 'time' && (
                  <input
                    id={field.name}
                    type="time"
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
                    {roleOptions(field, familyMembers, watchedFormData)
                      .filter(
                        (option) =>
                          !(
                            option.value === 'kepala_keluarga' &&
                            headTakenBy(field.name, config.fields, watchedFormData)
                          ),
                      )
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label ?? option.value}
                        </option>
                      ))}
                  </select>
                )}

                {field.type === 'occupation' && (
                  <OccupationField
                    field={field}
                    register={register}
                    setValue={setValue}
                    value={watchedFormData?.[field.name]}
                    occupations={occupations}
                    loadFailed={occupationsFailed}
                    errors={errors}
                    renderError={renderError}
                  />
                )}

                {field.type === 'repeater' && (
                  <RepeaterField
                    field={field}
                    control={control}
                    register={register}
                    rows={watchedFormData?.[field.name]}
                    errors={errors}
                    catalogs={{ familyMembers, occupations }}
                    answers={watchedFormData}
                  />
                )}

                {field.type === 'family_member' && (
                  <select
                    id={field.name}
                    {...register(field.name)}
                    className={`sid-select ${fieldError ? 'sid-input-error' : ''}`}
                  >
                    <option value="">
                      {field.required || field.requiredWhenHead
                        ? 'Pilih anggota keluarga...'
                        : (field.emptyLabel ?? 'Tidak ada di KK')}
                    </option>
                    {memberChoices(field, familyMembers, watchedFormData, headChoice).map(
                      (member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.family_role_label})
                        </option>
                      ),
                    )}
                  </select>
                )}

                {field.type === 'family_member' &&
                  familyMembers.length > 0 &&
                  memberChoices(field, familyMembers, watchedFormData, headChoice).length === 0 && (
                    <p className="sid-form-field-error" role="status">
                      Tidak ada anggota KK Anda yang dapat dipilih untuk isian ini.
                    </p>
                  )}

                {field.type === 'village_area' && (
                  <VillageAreaField
                    field={field}
                    value={watchedFormData?.[field.name]}
                    setValue={setValue}
                    areas={areas}
                    loadFailed={areasFailed}
                    errors={errors}
                  />
                )}

                {field.type === 'family_members' && (
                  <FamilyMembersField
                    field={field}
                    members={familyMembers}
                    loadFailed={familyFailed}
                    value={watchedFormData?.[field.name]}
                    setValue={setValue}
                    errors={errors}
                  />
                )}

                {field.type === 'file' && (
                  <FileUploader
                    field={field}
                    files={watchedFormData?.[field.name] || []}
                    onFileChange={(e, name) => handleFileChange(e, name, field.multiple)}
                    onRemoveFile={handleRemoveFile}
                  />
                )}

                {!['occupation', 'repeater', 'family_members'].includes(field.type) &&
                  renderError(field.name)}
              </div>
            )
          })}
        </div>
      </section>

      {signatureSlots.length > 0 && (
        <section className="sid-section">
          <h3 className="sid-section-title">{headings.signatures}</h3>

          <div className="flex flex-col gap-4">
            {applicantSlots.map((slot) => (
              <div key={slot.key} className="sid-form-group">
                <span className="sid-label">{slot.label}</span>

                {hasSignature === false ? (
                  <p className="sid-admin-alert sid-admin-alert-error" role="alert">
                    Anda belum memiliki tanda tangan. <Link to="/profil">Buat tanda tangan</Link>{' '}
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
        <p className="sid-admin-alert sid-admin-alert-error" role="alert">
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
          disabled={isSubmitting || (needsOwnSignature && hasSignature === false)}
          aria-busy={isSubmitting}
          className="sid-btn sid-btn-primary"
        >
          {isSubmitting ? 'Mengirim...' : 'Kirim'}
        </button>
      </div>
    </form>
  )
}
