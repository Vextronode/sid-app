// `accept: 'image'` pada definisi membatasi unggahan ke gambar.
function fileAccept(field) {
  return field.accept === 'image' ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'
}

function normalizeField(field) {
  return {
    name: field.name,
    label: field.label ?? field.name,
    type: field.type ?? 'text',
    required: Boolean(field.required),
    placeholder: field.placeholder ?? '',
    options: Array.isArray(field.options) ? field.options : [],
    accept: field.type === 'file' ? fileAccept(field) : undefined,
    imageOnly: field.type === 'file' && field.accept === 'image',
    multiple: false,
    visibleWhen: field.visible_when ?? null,
    // Keterangan singkat di bawah label isian.
    help: field.help ?? null,
    // Nilai awal isian (mis. pengurusan ke Disdukcapil = sendiri).
    defaultValue: field.default ?? null,
    // family_member: batas jenis kelamin anggota yang dapat dipilih (L/P).
    gender: field.gender ?? null,
    // family_member: hubungan dalam KK yang boleh dipilih (mis. hanya anak).
    roles: Array.isArray(field.roles) ? field.roles : null,
    // family_member: minimal sekian tahun lebih tua dari isian acuan.
    olderThan: field.older_than ?? null,
    // Pilihan SHDK: acuan orang pemilik hubungan (Suami L, Istri P).
    roleOf: field.role_of ?? null,
    // family_member: pemohon sendiri tidak dapat dipilih (mis. almarhum).
    notSelf: Boolean(field.not_self),
    // Teks pilihan kosong isian family_member opsional.
    emptyLabel: field.empty_label ?? null,
    // Nilai diturunkan dari data pemohon ({ column, map }), mis. peran
    // suami/istri dari jenis kelamin; ditanyakan bila datanya kosong.
    fromApplicant: field.from_applicant ?? null,
    // Isian NIK saksi (label slotnya) dan isian NIK yang tidak boleh sama
    // dengannya (saksi lainnya, pihak dalam surat).
    witness: field.witness ?? null,
    notSameAs: Array.isArray(field.not_same_as) ? field.not_same_as : [],
    // Isian NIK opsional: pasangan from_nik-nya diketik bila NIK kosong.
    typedWhenEmpty: Boolean(field.typed_when_empty),
    // Isian nama yang diisi otomatis dari NIK di isian ini.
    fromNik: field.from_nik ?? null,
    // Data yang diambil dari NIK: nama (bawaan) atau No. KK.
    fromNikValue: field.from_nik_value ?? 'name',
    // family_member yang hanya tampil (dan wajib) bila anggota di isian ini
    // kepala keluarga, mis. kepala keluarga baru saat kepala keluarga meninggal
    // atau ikut pindah (isian family_members).
    requiredWhenHead: field.required_when_head ?? null,
    // Isian berulang (repeater): sub-isian per baris dan batas jumlah baris.
    fields: Array.isArray(field.fields) ? field.fields.map(normalizeField) : [],
    min: field.min ?? null,
    // Repeater KK baru: tepat satu Kepala Keluarga di kolom `column` (+ isian `with`).
    oneHead: field.one_head ?? null,
    max: field.max ?? null,
    itemLabel: field.item_label ?? '',
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
 * Nilai isian `fromApplicant` dari data pemohon (mis. jenis kelamin L ->
 * suami), atau null bila datanya kosong sehingga isian tetap ditanyakan.
 */
export function applicantValue(field, user) {
  const source = field.fromApplicant
  const raw = source ? user?.citizen?.[source.column] : null

  return raw === null || raw === undefined ? null : (source.map?.[raw] ?? null)
}

/** Nilai awal form untuk semua isian `fromApplicant` yang diketahui. */
export function applicantValues(fields, user) {
  return Object.fromEntries(
    fields
      .map((field) => [field.name, applicantValue(field, user)])
      .filter(([, value]) => value !== null),
  )
}

/**
 * Definisi form sebuah jenis surat sepenuhnya berasal dari backend
 * (letter_types.form_fields dan signature_slots), sehingga form, validasi
 * server, dan template PDF memakai satu sumber yang sama.
 */
export function getLetterTypeFormConfig(letterType) {
  if (!letterType?.code) return null

  // Isian yang diisi sistem saat pengajuan (`same_value`, `family_head_of`)
  // tidak ditanyakan.
  const definitionFields = (
    Array.isArray(letterType.form_fields) ? letterType.form_fields : []
  ).filter((field) => !field.same_value && !field.family_head_of)
  const signatureSlots = Array.isArray(letterType.signature_slots) ? letterType.signature_slots : []

  return {
    id: letterType.id,
    code: letterType.code,
    title: letterType.name,
    requirementsInfo: letterType.requirements_info,
    producesLetter: letterType.produces_letter ?? true,
    dataAction: letterType.data_action ?? 'none',
    hasSupportingDocument: Boolean(letterType.has_supporting_document),
    // Isian form hanya yang didefinisikan jenis suratnya (mengikuti
    // template fisik); tidak ada isian umum seperti keperluan/catatan.
    // family_roster disusun sistem saat pengajuan, tidak diisi pemohon.
    fields: definitionFields
      .filter((field) => field?.name && field.type !== 'family_roster')
      .map(normalizeField),
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
