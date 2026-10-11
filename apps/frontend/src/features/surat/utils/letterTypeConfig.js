// Isian yang dimiliki semua jenis surat. Dikirim sebagai purpose, lampiran
// umum, dan notes; bukan bagian dari definisi per jenis surat.
const COMMON_FIELDS = [
  {
    name: 'keperluan',
    label: 'Keperluan',
    type: 'textarea',
    required: true,
    placeholder: 'Jelaskan keperluan surat',
    scope: 'common',
  },
  {
    name: 'dokumen',
    label: 'Upload Dokumen Pendukung',
    type: 'file',
    required: false,
    multiple: true,
    accept: '.pdf,.jpg,.jpeg,.png',
    scope: 'common',
  },
  {
    name: 'catatan',
    label: 'Catatan Tambahan',
    type: 'textarea',
    required: false,
    placeholder: 'Opsional',
    scope: 'common',
  },
]

export const COMMON_FIELD_NAMES = COMMON_FIELDS.map((field) => field.name)

function normalizeField(field) {
  return {
    name: field.name,
    label: field.label ?? field.name,
    type: field.type ?? 'text',
    required: Boolean(field.required),
    placeholder: field.placeholder ?? '',
    options: Array.isArray(field.options) ? field.options : [],
    accept: field.type === 'file' ? '.pdf,.jpg,.jpeg,.png' : undefined,
    multiple: false,
    scope: 'definition',
  }
}

function normalizeSlot(slot) {
  return {
    key: slot.key,
    label: slot.label ?? slot.key,
    signer: slot.signer === 'applicant' ? 'applicant' : 'other',
  }
}

/**
 * Definisi form sebuah jenis surat sepenuhnya berasal dari backend
 * (letter_types.form_fields dan signature_slots), sehingga form, validasi
 * server, dan template PDF memakai satu sumber yang sama.
 */
export function getLetterTypeFormConfig(letterType) {
  if (!letterType?.code) return null

  const definitionFields = Array.isArray(letterType.form_fields) ? letterType.form_fields : []
  const signatureSlots = Array.isArray(letterType.signature_slots) ? letterType.signature_slots : []

  return {
    id: letterType.id,
    code: letterType.code,
    title: letterType.name,
    type: letterType.verification_type,
    requirementsInfo: letterType.requirements_info,
    producesLetter: letterType.produces_letter ?? true,
    dataAction: letterType.data_action ?? 'none',
    hasSupportingDocument: Boolean(letterType.has_supporting_document),
    fields: [
      ...definitionFields.filter((field) => field?.name).map(normalizeField),
      ...COMMON_FIELDS,
    ],
    signatureSlots: signatureSlots.filter((slot) => slot?.key).map(normalizeSlot),
  }
}

const DATA_ACTION_LABELS = {
  update_citizen: 'ubah data warga',
  create_citizen: 'tambah warga',
}

// Satu jenis surat boleh menerbitkan surat sekaligus memicu aksi data.
export function describeLetterTypeOutput(letterType) {
  const parts = []

  if (letterType.produces_letter ?? true) parts.push('Surat')
  if (DATA_ACTION_LABELS[letterType.data_action])
    parts.push(DATA_ACTION_LABELS[letterType.data_action])

  return parts.length ? parts.join(' + ') : '-'
}
