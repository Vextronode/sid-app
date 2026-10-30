import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

import { confirmDialog, currentDialog } from '@/shared/lib/dialog'

const DISCARD_DIALOG = {
  title: 'Buang perubahan?',
  message: 'Perubahan yang belum disimpan akan hilang.',
  confirmLabel: 'Buang perubahan',
  cancelLabel: 'Lanjut mengisi',
}

// Penutup form yang bertanya dulu bila isian sudah diubah. Pakai
// requestClose(onClose) hanya untuk penutupan oleh pengguna (X, Batal, klik
// latar, Escape), bukan untuk menutup setelah simpan berhasil.
//
// escapeClose (opsional): fungsi penutup yang dipanggil saat Escape ditekan
// selagi form terbuka. Escape diabaikan bila dialog global sedang tampil,
// karena DialogHost juga mendengarkan Escape untuk menutup dirinya.
export function useConfirmDiscard(isDirty, { disabled = false, escapeClose = null } = {}) {
  const dirty = useRef(isDirty)
  const escapeRef = useRef(escapeClose)

  // Nilai terbaru dipakai di handler tanpa membuat ulang listener.
  useLayoutEffect(() => {
    dirty.current = isDirty
    escapeRef.current = escapeClose
  })

  const requestClose = useCallback(
    async (close) => {
      if (disabled) return false
      if (dirty.current && !(await confirmDialog(DISCARD_DIALOG))) return false

      close()
      return true
    },
    [disabled],
  )

  const hasEscape = Boolean(escapeClose)

  useEffect(() => {
    if (!hasEscape) return undefined

    const handleKey = (event) => {
      if (event.key !== 'Escape' || currentDialog() || !escapeRef.current) return
      requestClose(escapeRef.current)
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [hasEscape, requestClose])

  return requestClose
}
