// Konfigurasi form surat hasil normalisasi definisi backend
// (letterTypeConfig.getLetterTypeFormConfig).
import type {
  FieldCondition,
  FieldOption,
  Id,
  Letter,
  LetterFormField,
  MessageResponse,
} from '@/types'
import type { FulfillmentProposal } from './api/letterExtrasApi'

export type SuratField = {
  name: string
  label: string
  type: string
  required: boolean
  placeholder: string
  options: FieldOption[]
  accept: string | undefined
  imageOnly: boolean
  multiple: boolean
  past: boolean
  reportDeadline: LetterFormField['report_deadline']
  integer: boolean
  minValue: number | null
  visibleWhen: FieldCondition | null
  help: string | null
  defaultValue: LetterFormField['default']
  gender: 'L' | 'P' | null
  roles: string[] | null
  olderThan: LetterFormField['older_than']
  roleOf: string | null
  notSelf: boolean
  emptyLabel: string | null
  fromApplicant: LetterFormField['from_applicant']
  prefillFromApplicant: string | null
  witness: string | null
  notSameAs: string[]
  typedWhenEmpty: boolean
  includeInactive: boolean
  fromNik: string | null
  fromNikValue: string
  requiredWhenHead: string | null
  fields: SuratField[]
  min: number | null
  oneHead: LetterFormField['one_head']
  max: number | null
  itemLabel: string
  scope: 'definition'
}

export type SuratSignatureSlot = {
  key: string
  label: string
  signer: 'applicant' | 'other'
}

export type SuratFormConfig = {
  id: number
  code: string
  title: string
  requirementsInfo: string | null
  producesLetter: boolean
  dataAction: string
  hasSupportingDocument: boolean
  fields: SuratField[]
  signatureSlots: SuratSignatureSlot[]
}

// Nilai isian form surat, per nama isian.
export type SuratFormValues = Record<string, unknown>

// GET /api/profile/family-members: anggota KK pemohon.
export type ApplicantFamilyMember = {
  id: string
  name: string
  family_role: string | null
  family_role_label: string
  gender: 'L' | 'P' | null
  date_of_birth: string | null
  nik_masked: string | null
  is_self: boolean
}

// GET /api/village-areas: Dusun -> RW -> RT.
export type VillageArea = {
  id: number
  name: string
  rws?: { id: number; number: string; rts?: { id: number; number: string }[] }[]
}

// Form Terapkan per aksi data (FulfillmentPanel): selesai dengan respons
// applyFulfillment.
export type FulfillmentFormProps = {
  letterId: Id
  proposal: FulfillmentProposal
  onDone: (response: MessageResponse<Letter>) => void
}
