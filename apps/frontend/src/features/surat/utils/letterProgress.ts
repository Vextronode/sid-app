import { SURAT_STATUS } from '@/constants/suratStatus'
import type { LetterListItem, LetterResultStage } from '@/types'

export type LetterProgressTone = 'pending' | 'progress' | 'done' | 'rejected'

export type LetterProgress = {
  stages: string[]
  tone: LetterProgressTone
  current: number
  rejected: boolean
  message: string
}

// Bagian surat yang menentukan posisinya di jalur tahapan.
type ProgressLetter = Partial<
  Pick<
    LetterListItem,
    | 'status'
    | 'result_stage'
    | 'result_rejected'
    | 'is_expired'
    | 'rejected_at_step'
    | 'awaiting_signatures'
    | 'current_step'
    | 'current_step_order'
  >
>

// Semua jenis surat memakai satu alur tetap: RT -> Kepala/Sekretaris Desa.
// Tahap milik pemohon sendiri dilewati backend, tetapi tetap tampil sebagai
// tahap yang sudah lewat.
export const LETTER_STAGES = ['Diajukan', 'RT', 'Desa', 'Terbit']

// Formulir pelayanan bersambung setelah terbit: pemohon mengunggah hasil
// dari instansi luar pada surat yang sama, lalu desa memverifikasinya.
export const RESULT_LETTER_STAGES = [...LETTER_STAGES, 'Unggah hasil', 'Verifikasi']

const RESULT_PROGRESS: Record<
  LetterResultStage,
  Pick<LetterProgress, 'tone' | 'current' | 'message'>
> = {
  awaiting_upload: {
    tone: 'pending',
    current: 4,
    message: 'Formulir terbit. Bawa ke instansi yang dituju, lalu unggah hasilnya di detail surat.',
  },
  under_review: {
    tone: 'progress',
    current: 5,
    message: 'Hasil sudah diunggah dan menunggu verifikasi desa.',
  },
  accepted: {
    tone: 'done',
    current: RESULT_LETTER_STAGES.length,
    message: 'Hasil dari instansi sudah diverifikasi desa.',
  },
}

const POSITION_STAGE: Record<string, number> = { rt: 1, kepala_desa: 2, sekretaris_desa: 2 }

const POSITION_NAME: Record<string, string> = {
  rt: 'Ketua RT',
  kepala_desa: 'Kepala Desa',
  sekretaris_desa: 'Sekretaris Desa',
}

const STAGE_NAME: Record<number, string> = { 1: 'Ketua RT', 2: 'pemerintah desa' }

// Nomor urut tahap di backend (1 = RT, 2 = desa) -> indeks tahap di jalur.
function stageFromOrder(order: number | null | undefined) {
  return Math.min(Math.max(Number(order) || 1, 1), 2)
}

/**
 * Posisi surat di jalur tahapan untuk daftar "Surat Saya".
 *
 * `current` adalah indeks tahap yang sedang berjalan (atau tempat surat
 * ditolak); tahap sebelumnya selesai. Surat terbit menandai semua tahap
 * selesai (`current` = jumlah tahap).
 */
export function getLetterProgress(letter: ProgressLetter | null | undefined): LetterProgress {
  const status = String(letter?.status ?? '').toLowerCase()
  const stages = letter?.result_stage ? RESULT_LETTER_STAGES : LETTER_STAGES

  if (status === SURAT_STATUS.APPROVED && letter?.result_rejected) {
    return {
      stages,
      tone: 'pending',
      current: 4,
      rejected: false,
      message:
        'Hasil yang diunggah ditolak desa. Buka detail untuk melihat alasannya dan unggah ulang.',
    }
  }

  const resultStage = letter?.result_stage

  if (status === SURAT_STATUS.APPROVED && resultStage && RESULT_PROGRESS[resultStage]) {
    return { ...RESULT_PROGRESS[resultStage], stages, rejected: false }
  }

  if (status === SURAT_STATUS.APPROVED) {
    return {
      stages,
      tone: 'done',
      current: LETTER_STAGES.length,
      rejected: false,
      message: letter?.is_expired
        ? 'Surat sudah terbit, tetapi masa berlakunya sudah habis.'
        : 'Surat sudah terbit. Buka detail untuk mengunduh.',
    }
  }

  if (status === SURAT_STATUS.REJECTED) {
    const current = stageFromOrder(letter?.rejected_at_step)

    return {
      stages,
      tone: 'rejected',
      current,
      rejected: true,
      message: `Ditolak oleh ${STAGE_NAME[current]}. Buka detail untuk melihat alasannya.`,
    }
  }

  if (letter?.awaiting_signatures) {
    return {
      stages,
      tone: 'pending',
      current: 0,
      rejected: false,
      message: 'Menunggu tanda tangan sebelum diteruskan ke RT.',
    }
  }

  const position = letter?.current_step?.approver_position
  const current =
    (position ? POSITION_STAGE[position] : undefined) ?? stageFromOrder(letter?.current_step_order)

  return {
    stages,
    tone: status === SURAT_STATUS.PENDING ? 'pending' : 'progress',
    current,
    rejected: false,
    message: `Menunggu persetujuan ${(position ? POSITION_NAME[position] : undefined) ?? STAGE_NAME[current]}.`,
  }
}

export function formatLetterDate(value: string | null | undefined) {
  if (!value) return '-'

  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
