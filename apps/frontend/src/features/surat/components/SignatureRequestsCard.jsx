import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SIGNATURE_REQUESTS_ANCHOR } from '@/features/notifikasi/utils/notificationTarget'
import {
  acceptSignatureRequest,
  getSignatureBlocks,
  getSignatureRequests,
  rejectSignatureRequest,
  removeSignatureBlock,
} from '../api/signatureApi'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'

function serverMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0]

    if (first) return first
  }

  return error?.response?.data?.message ?? fallback
}

/**
 * Permintaan tanda tangan dari warga lain yang ditujukan ke akun ini.
 * Persetujuan berlaku per surat; pemilik akun melihat ringkasan surat
 * lalu menyetujui atau menolak, dan dapat memblokir pemohon.
 */
export function SignatureRequestsCard() {
  const [requests, setRequests] = useState([])
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [blockOnReject, setBlockOnReject] = useState({})
  const [passwords, setPasswords] = useState({})
  const sectionRef = useRef(null)
  const { hash } = useLocation()
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [requestData, blockData] = await Promise.all([
        getSignatureRequests(),
        getSignatureBlocks(),
      ])

      setRequests(Array.isArray(requestData) ? requestData : [])
      setBlocks(Array.isArray(blockData) ? blockData : [])
    } catch (requestError) {
      setError(serverMessage(requestError, 'Gagal memuat permintaan tanda tangan.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  // Dibuka dari notifikasi permintaan tanda tangan: gulir ke bagian ini.
  useEffect(() => {
    if (!loading && hash === `#${SIGNATURE_REQUESTS_ANCHOR}`) {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [loading, hash])

  const run = async (id, action, successMessage) => {
    setBusyId(id)
    setError('')

    try {
      await action()
      notifySuccess(successMessage)
      await load()
    } catch (requestError) {
      setError(serverMessage(requestError, 'Aksi gagal diproses.'))
    } finally {
      setBusyId(null)
    }
  }

  if (loading || (requests.length === 0 && blocks.length === 0 && !error)) {
    return null
  }

  return (
    <section
      ref={sectionRef}
      id={SIGNATURE_REQUESTS_ANCHOR}
      className="sid-card"
      aria-labelledby="signature-requests-heading"
    >
      <h2 id="signature-requests-heading" className="sid-section-title">
        Permintaan Tanda Tangan
      </h2>

      {error && (
        <p role="alert" className="sid-admin-alert sid-admin-alert-error">
          {error}
        </p>
      )}

      {requests.length === 0 ? (
        <p className="sid-upload-description">Tidak ada permintaan yang menunggu.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {requests.map((request) => (
            <li key={request.id} className="sid-modal-note">
              <p className="sid-modal-note-label">
                {request.applicant_name} meminta tanda tangan Anda sebagai {request.slot_label}
              </p>
              <p className="sid-modal-note-text">
                {request.letter_type ?? 'Surat'}
                {request.purpose ? ` — ${request.purpose}` : ''}
              </p>
              {request.expires_at && (
                <p className="sid-upload-description">
                  Berlaku sampai {new Date(request.expires_at).toLocaleDateString('id-ID')}
                </p>
              )}

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(blockOnReject[request.id])}
                  onChange={(event) =>
                    setBlockOnReject((current) => ({
                      ...current,
                      [request.id]: event.target.checked,
                    }))
                  }
                />
                <span>Blokir pemohon ini bila saya menolak</span>
              </label>

              <label className="sid-label" htmlFor={`signature-password-${request.id}`}>
                Kata sandi Anda (wajib untuk menyetujui)
              </label>
              <input
                id={`signature-password-${request.id}`}
                type="password"
                autoComplete="current-password"
                className="sid-input"
                value={passwords[request.id] ?? ''}
                onChange={(event) =>
                  setPasswords((current) => ({ ...current, [request.id]: event.target.value }))
                }
              />

              <div className="sid-actions">
                <button
                  type="button"
                  className="sid-btn sid-btn-secondary"
                  disabled={busyId !== null}
                  onClick={async () => {
                    const confirmed = await confirmDialog({
                      title: `Tolak permintaan tanda tangan dari ${request.applicant_name}?`,
                      message: `${
                        blockOnReject[request.id] ? 'Pemohon juga akan diblokir. ' : ''
                      }Surat tidak dapat diproses tanpa tanda tangan Anda.`,
                      confirmLabel: 'Tolak',
                    })

                    if (!confirmed) return

                    run(
                      request.id,
                      () =>
                        rejectSignatureRequest(request.id, {
                          block: blockOnReject[request.id],
                        }),
                      'Permintaan ditolak.',
                    )
                  }}
                >
                  Tolak
                </button>
                <button
                  type="button"
                  className="sid-btn sid-btn-primary"
                  disabled={busyId !== null || !passwords[request.id]}
                  onClick={() =>
                    run(
                      request.id,
                      () => acceptSignatureRequest(request.id, passwords[request.id]),
                      'Permintaan disetujui. Tanda tangan Anda dipakai pada surat tersebut.',
                    )
                  }
                >
                  {busyId === request.id ? 'Memproses...' : 'Setujui'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {blocks.length > 0 && (
        <>
          <p className="sid-label">Pemohon yang Anda blokir</p>
          <ul className="flex flex-col gap-2">
            {blocks.map((block) => (
              <li key={block.id} className="flex items-center justify-between gap-2">
                <span>{block.blocked_user_name ?? 'Pengguna'}</span>
                <button
                  type="button"
                  className="sid-btn sid-btn-secondary"
                  disabled={busyId !== null}
                  onClick={() =>
                    run(
                      `block-${block.id}`,
                      () => removeSignatureBlock(block.id),
                      'Blokir dicabut.',
                    )
                  }
                >
                  Cabut blokir
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
