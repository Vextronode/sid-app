// Surat dan jenis surat.
// Sumber: LetterListResource (daftar), LetterResource (detail),
// LetterTypeResource, serta resource relasinya.
import type { IsoDateString, Uuid } from './api'
import type { Citizen } from './citizen'
import type { User } from './user'

export type LetterStatus = 'pending' | 'in_progress' | 'approved' | 'rejected'

// Tahap unggah hasil dari instansi luar; null bila tidak berlaku.
export type LetterResultStage = 'awaiting_upload' | 'under_review' | 'accepted'

export type LetterCurrentStep = {
  step_order: number
  approver_position: string
  is_final: boolean
}

// Satu baris di GET /api/letters.
export type LetterListItem = {
  id: Uuid
  letter_type_id: number
  submitted_by: Uuid | null
  citizen_id: Uuid | null
  letter_number: string | null
  applicant_name: string | null
  notes: string | null
  status: LetterStatus
  current_step_order: number
  current_step: LetterCurrentStep | null
  rejected_at_step: number | null
  // Catatan keputusan tolak terakhir; null bila surat tidak ditolak.
  rejection_reason: string | null
  is_overdue: boolean
  awaiting_signatures: boolean
  needs_fulfillment: boolean
  result_stage: LetterResultStage | null
  result_rejected: boolean
  expires_at: IsoDateString | null
  is_expired: boolean
  submitted_at: IsoDateString | null
  processed_at: IsoDateString | null
  created_at: IsoDateString | null
  updated_at: IsoDateString | null
  letter_type: {
    id: number
    name: string
    code: string
    signed_by_village_head: boolean
  } | null
  citizen: { id: Uuid; name: string } | null
}

export type LetterApproval = {
  id: number
  letter_id: Uuid
  approved_by: Uuid | null
  approval_level: string
  flow_step_id: number | null
  action: 'approved' | 'rejected' | null
  notes: string | null
  deadline_at: IsoDateString | null
  reminded_at: IsoDateString | null
  created_at: IsoDateString | null
  approver_name?: string | null
  approved_by_user?: User
}

export type LetterStatusLog = {
  id: number
  letter_id: Uuid
  actor_id: Uuid | null
  actor_name?: string
  old_status: LetterStatus | null
  new_status: LetterStatus
  notes: string | null
  ip_address: string | null
  created_at: IsoDateString | null
}

export type LetterAttachmentKind = 'attachment' | 'field' | 'result'

export type LetterAttachment = {
  id: number
  kind: LetterAttachmentKind
  field: string | null
  original_name: string
  mime_type: string
  size: number
  url: string
  created_at: IsoDateString | null
}

export type LetterSignatureStatus = 'pending' | 'signed' | 'rejected' | 'expired' | 'cancelled'

export type LetterSignature = {
  slot_key: string
  slot_label: string
  signer_type: 'witness'
  method: 'digital' | 'wet' | 'consent' | 'rt_check' | 'manual'
  status: LetterSignatureStatus
  signer_name: string | null
  expires_at: IsoDateString | null
  responded_at: IsoDateString | null
}

export type LetterResult = {
  id: number
  status: 'submitted' | 'accepted' | 'rejected'
  submitted_at: IsoDateString | null
  reviewed_at: IsoDateString | null
  reviewer_name?: string | null
  review_notes: string | null
  attachments?: LetterAttachment[]
}

export type LetterDocument = {
  key: string
  title: string
}

// Syarat tampil isian (visible_when), sama dengan AppSupportFieldCondition:
// { field, equals } | { field, in } | { field, not_in } | { field, filled }
// | { any: [syarat] } | { all: [syarat] }.
export type FieldCondition = {
  field?: string
  equals?: string | number | boolean
  in?: (string | number)[]
  not_in?: (string | number)[]
  filled?: boolean
  any?: FieldCondition[]
  all?: FieldCondition[]
}

export type FieldOption = { value: string; label?: string }

// Satu isian form dinamis dari letter_types.form_fields (snake_case backend).
export type LetterFormField = {
  name: string
  label?: string
  type?: string
  required?: boolean
  placeholder?: string
  options?: FieldOption[]
  // 'image': hanya gambar; selain itu PDF atau gambar.
  accept?: string
  past?: boolean
  report_deadline?: { days: number; event: string; when?: FieldCondition | null } | null
  integer?: boolean
  min_value?: number | null
  visible_when?: FieldCondition | null
  help?: string | null
  default?: string | number | boolean | null
  gender?: 'L' | 'P' | null
  roles?: string[]
  older_than?: { field: string; years: number } | null
  role_of?: string | null
  not_self?: boolean
  empty_label?: string | null
  from_applicant?: { column: string; map?: Record<string, string> } | null
  prefill_from_applicant?: string | null
  witness?: string | null
  not_same_as?: string[]
  typed_when_empty?: boolean
  include_inactive?: boolean
  from_nik?: string | null
  // Kolom data warga yang diambil dari NIK (bawaan: name).
  from_nik_value?: string
  required_when_head?: string | null
  fields?: LetterFormField[]
  min?: number | null
  max?: number | null
  one_head?: { column: string; with?: string | null } | null
  item_label?: string
  // Diisi sistem saat pengajuan, tidak ditanyakan.
  same_value?: string | null
  family_head_of?: string | null
}

export type LetterType = {
  id: number
  code: string
  name: string
  description: string | null
  category: string | null
  category_label: string | null
  template: string | null
  requirements_info: string | null
  // Dokumen yang dibawa ke instansi luar (Layanan Kependudukan).
  carry_documents: { forms?: string[]; attachments?: string[] } | null
  flow_id: number | null
  flow?: { id: number; name: string }
  assigned_role: string | null
  validity_days: number | null
  is_active: boolean
  produces_letter: boolean
  issues_letter_number: boolean
  signed_by_village_head: boolean
  data_action: string | null
  form_fields: LetterFormField[]
  data_fields: unknown[]
  has_supporting_document: boolean
  status_label: string
}

// GET /api/letters/{id}. Field opsional hanya ada bila relasinya dimuat backend.
export type Letter = {
  id: Uuid
  village_id: Uuid
  letter_type_id: number
  submitted_by: Uuid | null
  on_behalf_of: Uuid | null
  citizen_id: Uuid | null
  letter_number: string | null
  applicant_name: string | null
  applicant_nik_masked: string | null
  purpose: string | null
  payload: Record<string, unknown> | null
  notes: string | null
  status: LetterStatus
  flow_id: number | null
  current_step_order: number
  current_step?: LetterCurrentStep | null
  rejected_at_step: number | null
  is_overdue: boolean
  expires_at: IsoDateString | null
  is_expired: boolean
  submitted_at: IsoDateString | null
  processed_at: IsoDateString | null
  signed_by_official_id: number | null
  fulfilled_at: IsoDateString | null
  fulfilled_by: Uuid | null
  needs_fulfillment?: boolean
  result_stage?: LetterResultStage | null
  result_upload_hint?: string | null
  results?: LetterResult[]
  can_upload_result?: boolean
  can_fulfill?: boolean
  can_review_result?: boolean
  created_at: IsoDateString | null
  updated_at: IsoDateString | null
  citizen?: Citizen
  letter_type?: LetterType
  approvals?: LetterApproval[]
  status_logs?: LetterStatusLog[]
  attachments?: LetterAttachment[]
  awaiting_signatures: boolean
  signatures?: LetterSignature[]
  documents?: LetterDocument[]
  has_supporting_document?: boolean
  rw_fyi_notified?: boolean
  user?: User
}

export type LetterDecision = 'approved' | 'rejected'

export type LetterStatusCounts = Record<LetterStatus, number>

// GET /api/letters/summary: angka ringkasan atas scope daftar surat.
export type LetterSummary = {
  total: number
  by_status: LetterStatusCounts
  overdue: number
  by_type: { id: number; name: string | null; total: number }[]
  by_period: Record<'day' | 'week' | 'month', LetterStatusCounts & { total: number }>
}
