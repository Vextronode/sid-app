import { previewFulfillment } from '../api/letterExtrasApi'
import { confirmDialog } from '@/shared/lib/dialog'

const KIND_LABELS = {
  create: 'warga baru',
  update: 'diubah',
  deactivate: 'dinonaktifkan',
}

/**
 * Pop up konfirmasi Terapkan: server menghitung perubahan per warga (lama ->
 * baru) dengan nilai yang sama persis, lalu Kasi/Kaur mengonfirmasinya.
 * Resolve true bila dikonfirmasi; galat pratinjau (mis. NIK belum diisi)
 * diteruskan ke pemanggil.
 */
export async function confirmFulfillment(letterId, values = {}, subjectNik = null, notes = null) {
  const changes = await previewFulfillment(letterId, values, subjectNik, notes)

  return confirmDialog({
    title: 'Konfirmasi perubahan data',
    message:
      changes.length === 0
        ? 'Tidak ada data warga yang berubah; surat hanya ditandai selesai.'
        : 'Periksa perubahan berikut sebelum disimpan. Perubahan hanya dapat diterapkan sekali.',
    details: changes.map((entry) => ({
      title: `${entry.name} (${KIND_LABELS[entry.kind] ?? 'diubah'})`,
      showOld: entry.kind !== 'create',
      rows: entry.changes.map((change) => ({
        label: change.label,
        from: change.old,
        to: change.new,
      })),
    })),
    confirmLabel: 'Konfirmasi',
    tone: 'primary',
  })
}
