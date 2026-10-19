import { SURAT_STATUS } from '@/constants/suratStatus'

// Semua jenis surat memakai satu alur tetap: RT -> Kepala/Sekretaris Desa.
// Tahap milik pemohon sendiri dilewati backend, tetapi tetap tampil sebagai
// tahap yang sudah lewat.
export const LETTER_STAGES = ['Diajukan', 'RT', 'Desa', 'Terbit']

const POSITION_STAGE = { rt: 1, kepala_desa: 2, sekretaris_desa: 2 }

const POSITION_NAME = {
  rt: 'Ketua RT',
  kepala_desa: 'Kepala Desa',
  sekretaris_desa: 'Sekretaris Desa',
}

const STAGE_NAME = { 1: 'Ketua RT', 2: 'pemerintah desa' }

// Nomor urut tahap di backend (1 = RT, 2 = desa) -> indeks tahap di jalur.
function stageFromOrder(order) {
  return Math.min(Math.max(Number(order) || 1, 1), 2)
}

/**
 * Posisi surat di jalur tahapan untuk daftar "Surat Saya".
 *
 * `current` adalah indeks tahap yang sedang berjalan (atau tempat surat
 * ditolak); tahap sebelumnya selesai. Surat terbit menandai semua tahap
 * selesai (`current` = jumlah tahap).
 */
export function getLetterProgress(letter) {
  const status = String(letter?.status ?? '').toLowerCase()

  if (status === SURAT_STATUS.APPROVED) {
    return {
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
      tone: 'rejected',
      current,
      rejected: true,
      message: `Ditolak oleh ${STAGE_NAME[current]}. Buka detail untuk melihat alasannya.`,
    }
  }

  if (letter?.awaiting_signatures) {
    return {
      tone: 'pending',
      current: 0,
      rejected: false,
      message: 'Menunggu tanda tangan sebelum diteruskan ke RT.',
    }
  }

  const position = letter?.current_step?.approver_position
  const current = POSITION_STAGE[position] ?? stageFromOrder(letter?.current_step_order)

  return {
    tone: status === SURAT_STATUS.PENDING ? 'pending' : 'progress',
    current,
    rejected: false,
    message: `Menunggu persetujuan ${POSITION_NAME[position] ?? STAGE_NAME[current]}.`,
  }
}

export function formatLetterDate(value) {
  if (!value) return '-'

  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
