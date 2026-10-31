import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { ShieldBan, ShieldCheck } from 'lucide-react'
import { SIGNATURE_REQUESTS_ANCHOR } from '@/features/notifikasi/utils/notificationTarget'
import {
  acceptSignatureRequest,
  addSignatureBlock,
  getSignatureBlocks,
  getSignatureRequests,
  rejectSignatureRequest,
  removeSignatureBlock,
} from '../api/signatureApi'
import type { SignatureBlock, SignatureRequest } from '../api/signatureApi'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'
import { getApiErrorMessage } from '@/shared/lib/apiError'

// Saksi, atau pihak terkait yang diminta persetujuannya (mis. kepala KK tujuan).
const isWitness = (request: SignatureRequest) => request.slot_label.startsWith('Saksi')

/**
 * Permintaan saksi (dan persetujuan pihak terkait) dari warga lain yang
 * ditujukan ke akun ini, beserta daftar blokir. Selalu tampil di profil,
 * walau kosong. Persetujuan berlaku per surat dan memerlukan kata sandi;
 * tidak ada tanda tangan digital (surat ditandatangani basah).
 */
export function SignatureRequestsCard() {
  const [requests, setRequests] = useState<SignatureRequest[]>([])
  const [blocks, setBlocks] = useState<SignatureBlock[]>([])
  const [loading, setLoading] = useState(true)
  // Id permintaan/blokir yang sedang diproses, atau 'block-add'.
  const [busyId, setBusyId] = useState<number | string | null>(null)
  const [blockOnReject, setBlockOnReject] = useState<Record<number, boolean>>({})
  const [passwords, setPasswords] = useState<Record<number, string>>({})
  const [showBlocks, setShowBlocks] = useState(false)
  const [blockNik, setBlockNik] = useState('')
  const sectionRef = useRef<HTMLElement>(null)
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
      setError(getApiErrorMessage(requestError, 'Gagal memuat permintaan saksi.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  // Dibuka dari notifikasi permintaan saksi: gulir ke bagian ini.
  useEffect(() => {
    if (!loading && hash === `#${SIGNATURE_REQUESTS_ANCHOR}`) {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [loading, hash])

  const run = async (
    id: number | string,
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setBusyId(id)
    setError('')

    try {
      await action()
      notifySuccess(successMessage)
      await load()

      return true
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Aksi gagal diproses.'))

      return false
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (request: SignatureRequest) => {
    const confirmed = await confirmDialog({
      title: isWitness(request)
        ? `Tolak menjadi saksi untuk ${request.applicant_name}?`
        : `Tolak permintaan persetujuan dari ${request.applicant_name}?`,
      message: `${blockOnReject[request.id] ? 'Pemohon juga akan diblokir. ' : ''}Surat tidak dapat diproses tanpa persetujuan Anda.`,
      confirmLabel: 'Tolak',
    })

    if (!confirmed) return

    run(
      request.id,
      () => rejectSignatureRequest(request.id, { block: blockOnReject[request.id] }),
      'Permintaan ditolak.',
    )
  }

  const addBlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const done = await run('block-add', () => addSignatureBlock(blockNik), 'Warga diblokir.')

    if (done) setBlockNik('')
  }

  return (
    <section
      ref={sectionRef}
      id={SIGNATURE_REQUESTS_ANCHOR}
      className="sid-card sid-sign-requests"
      aria-labelledby="signature-requests-heading"
    >
      <div className="sid-sign-requests-header">
        <h2 id="signature-requests-heading" className="sid-section-title">
          Permintaan Saksi
        </h2>
        <button
          type="button"
          className="sid-btn sid-btn-secondary"
          aria-expanded={showBlocks}
          onClick={() => setShowBlocks((value) => !value)}
        >
          <ShieldBan size={16} aria-hidden="true" />
          Daftar blokir ({blocks.length})
        </button>
      </div>

      <p className="sid-upload-description">
        Warga lain dapat meminta Anda menjadi saksi, atau meminta persetujuan Anda bila suratnya
        melibatkan Anda (mis. masuk ke KK Anda). Persetujuan hanya berlaku untuk satu surat.
      </p>

      {error && (
        <p role="alert" className="sid-admin-alert sid-admin-alert-error">
          {error}
        </p>
      )}

      {showBlocks && (
        <div className="sid-sign-blocks">
          <p className="sid-label">Warga yang Anda blokir</p>
          <p className="sid-upload-description">
            Permintaan saksi dan persetujuan dari warga ini tidak akan sampai ke akun Anda.
          </p>

          {blocks.length === 0 ? (
            <p className="sid-upload-description">Belum ada warga yang diblokir.</p>
          ) : (
            <ul className="sid-sign-block-list">
              {blocks.map((block) => (
                <li key={block.id}>
                  <span>
                    <strong>{block.blocked_user_name ?? 'Pengguna'}</strong>
                    {block.blocked_nik_masked && (
                      <span className="sid-upload-description">
                        {' '}
                        NIK {block.blocked_nik_masked}
                      </span>
                    )}
                  </span>
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
          )}

          <form onSubmit={addBlock} className="sid-sign-block-form">
            <input
              className="sid-input"
              inputMode="numeric"
              maxLength={16}
              aria-label="NIK warga yang diblokir"
              placeholder="NIK warga yang ingin diblokir (16 digit)"
              value={blockNik}
              onChange={(event) => setBlockNik(event.target.value.replace(/\D/g, ''))}
            />
            <button
              type="submit"
              className="sid-btn sid-btn-primary"
              disabled={busyId !== null || blockNik.length !== 16}
            >
              {busyId === 'block-add' ? 'Memblokir...' : 'Blokir'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p className="sid-upload-description">Memuat permintaan...</p>
      ) : requests.length === 0 ? (
        <p className="sid-sign-empty">
          <ShieldCheck size={18} aria-hidden="true" />
          Tidak ada permintaan yang menunggu persetujuan Anda.
        </p>
      ) : (
        <ul className="sid-sign-request-list">
          {requests.map((request) => (
            <li key={request.id} className="sid-sign-request">
              <span className={`sid-sign-request-kind${isWitness(request) ? ' witness' : ''}`}>
                {isWitness(request) ? 'Saksi' : 'Persetujuan'}
              </span>
              <p className="sid-sign-request-title">
                {isWitness(request)
                  ? `${request.applicant_name} meminta Anda menjadi ${request.slot_label}`
                  : `${request.applicant_name} meminta persetujuan Anda sebagai ${request.slot_label}`}
              </p>
              <p className="sid-sign-request-meta">
                {request.letter_type ?? 'Surat'}
                {request.purpose ? ` - ${request.purpose}` : ''}
                {request.expires_at &&
                  ` · berlaku sampai ${new Date(request.expires_at).toLocaleDateString('id-ID')}`}
              </p>

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

              <div className="sid-sign-request-actions">
                <button
                  type="button"
                  className="sid-btn sid-btn-secondary"
                  disabled={busyId !== null}
                  onClick={() => reject(request)}
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
                      isWitness(request)
                        ? 'Permintaan disetujui. Anda tercatat sebagai saksi pada surat tersebut.'
                        : 'Permintaan disetujui. Persetujuan Anda tercatat pada surat tersebut.',
                    )
                  }
                >
                  {busyId === request.id ? 'Memproses...' : 'Setujui'}
                </button>
              </div>

              <label className="sid-sign-request-block">
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
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
