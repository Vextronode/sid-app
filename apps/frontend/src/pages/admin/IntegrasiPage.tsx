import { useCallback, useEffect, useState } from 'react'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { StatusPill } from '@/components/ui/StatusPill'
import { formatDateTime } from '@/features/activity-log/labels'
import {
  getIntegrationClients,
  issueIntegrationToken,
  revokeIntegrationToken,
  updateIntegrationClientStatus,
} from '@/features/integrasi/api'
import type { IntegrationClient, IntegrationToken } from '@/features/integrasi/api'
import { PasswordConfirmModal } from '@/features/integrasi/components/PasswordConfirmModal'
import { TokenRevealModal } from '@/features/integrasi/components/TokenRevealModal'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'

// Aksi yang menunggu konfirmasi kata sandi.
type PendingAction =
  | { kind: 'enable'; client: IntegrationClient }
  | { kind: 'rotate'; client: IntegrationClient }
  | { kind: 'revoke'; client: IntegrationClient; token: IntegrationToken }

function lastUsed(value: string | null) {
  return value ? formatDateTime(value) : 'Belum pernah'
}

/**
 * Menu Integrasi Staf SIDUTama: aplikasi pihak ketiga (mis. Cimart) yang
 * memanggil API SID dengan token. Staf bisa menonaktifkan aplikasi,
 * menerbitkan token baru (rotate), dan mencabut token. Membuat aplikasi
 * dan mengubah hak akses hanya lewat server (artisan `integration:*`).
 */
export default function IntegrasiPage() {
  const [clients, setClients] = useState<IntegrationClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [newToken, setNewToken] = useState<{ clientName: string; token: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      setClients(await getIntegrationClients())
      setError('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal memuat daftar integrasi.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const replaceClient = (updated: IntegrationClient) => {
    setClients((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }

  const disable = async (client: IntegrationClient) => {
    const confirmed = await confirmDialog({
      title: `Nonaktifkan ${client.name}?`,
      message: `Semua request dari ${client.name} ditolak sampai diaktifkan kembali, jadi ${client.name} tidak bisa mengambil data baru dari SID, termasuk permohonan pedagang. Token tidak dicabut.`,
      confirmLabel: 'Nonaktifkan',
    })

    if (!confirmed) return

    setBusyId(client.id)
    setError('')

    try {
      const result = await updateIntegrationClientStatus(client.id, false)
      replaceClient(result.data)
      notifySuccess(result.message)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal menonaktifkan integrasi.'))
    } finally {
      setBusyId(null)
    }
  }

  // Dipanggil modal kata sandi; galat dilempar agar tampil di modal.
  const confirmPending = async (password: string) => {
    if (!pending) return

    const { client } = pending

    if (pending.kind === 'enable') {
      const result = await updateIntegrationClientStatus(client.id, true, password)
      replaceClient(result.data)
      notifySuccess(result.message)
    } else if (pending.kind === 'rotate') {
      const result = await issueIntegrationToken(client.id, password)
      replaceClient(result.data)
      setNewToken({ clientName: client.name, token: result.token })
    } else {
      const result = await revokeIntegrationToken(client.id, pending.token.id, password)
      replaceClient(result.data)
      notifySuccess(result.message)
    }

    setPending(null)
  }

  return (
    <div className="sid-operator-page">
      <div className="sid-operator-content">
        <div className="sid-operator-header">
          <div>
            <h1>Integrasi</h1>
            <p>
              Aplikasi lain yang terhubung ke SID lewat token, misalnya Cimart. Di sini Anda bisa
              menonaktifkan aplikasi, menerbitkan token baru, dan mencabut token. Menambah aplikasi
              dan mengubah hak aksesnya dilakukan tim teknis di server.
            </p>
          </div>
          <RefreshButton onRefresh={load} refreshing={loading} />
        </div>

        {error && (
          <p className="sid-admin-alert sid-admin-alert-error" role="alert">
            {error}
          </p>
        )}

        <div className="sid-operator-table-card">
          <div className="sid-operator-table-wrapper">
            <table className="sid-operator-table">
              <thead>
                <tr>
                  <th>Aplikasi</th>
                  <th className="center">Status</th>
                  <th>Hak Akses</th>
                  <th>Terakhir Dipakai</th>
                  <th className="center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading && clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      Memuat data...
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      Belum ada aplikasi yang terhubung.
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id}>
                      <td className="primary-text">{client.name}</td>
                      <td className="center">
                        <StatusPill active={client.is_active}>
                          {client.is_active ? 'Aktif' : 'Nonaktif'}
                        </StatusPill>
                      </td>
                      <td>
                        {client.abilities.length === 0
                          ? '-'
                          : client.abilities.map((ability) => (
                              <div key={ability.value}>{ability.label}</div>
                            ))}
                      </td>
                      <td>{lastUsed(client.last_used_at)}</td>
                      <td className="center">
                        <div className="sid-operator-actions">
                          {client.is_active ? (
                            <button
                              type="button"
                              className="sid-btn sid-btn-secondary"
                              disabled={busyId !== null}
                              onClick={() => disable(client)}
                            >
                              {busyId === client.id ? 'Memproses...' : 'Nonaktifkan'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="sid-btn sid-btn-secondary"
                              disabled={busyId !== null}
                              onClick={() => setPending({ kind: 'enable', client })}
                            >
                              Aktifkan
                            </button>
                          )}
                          <button
                            type="button"
                            className="sid-btn sid-btn-primary"
                            disabled={busyId !== null}
                            onClick={() => setPending({ kind: 'rotate', client })}
                          >
                            Terbitkan token baru
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {clients.map((client) => (
          <section
            key={client.id}
            className="sid-operator-table-card"
            aria-labelledby={`integration-tokens-${client.id}`}
          >
            <div className="sid-operator-header">
              <div>
                <h2 id={`integration-tokens-${client.id}`}>Token {client.name}</h2>
                <p>
                  Token lama tetap berlaku setelah token baru diterbitkan. Cabut token lama setelah
                  token baru terlihat dipakai. Bila token bocor, cabut segera lalu terbitkan token
                  baru.
                </p>
              </div>
            </div>
            <div className="sid-operator-table-wrapper">
              <table className="sid-operator-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Diterbitkan</th>
                    <th>Terakhir Dipakai</th>
                    <th className="center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {client.tokens.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty">
                        Tidak ada token aktif. {client.name} tidak bisa terhubung sampai token baru
                        diterbitkan.
                      </td>
                    </tr>
                  ) : (
                    client.tokens.map((token, index) => (
                      <tr key={token.id}>
                        <td className="primary-text">
                          {token.name}{' '}
                          <StatusPill tone={index === 0 ? 'active' : 'warning'}>
                            {index === 0 ? 'Terbaru' : 'Token lama'}
                          </StatusPill>
                        </td>
                        <td>{formatDateTime(token.created_at)}</td>
                        <td>{lastUsed(token.last_used_at)}</td>
                        <td className="center">
                          <div className="sid-operator-actions">
                            <button
                              type="button"
                              className="sid-btn sid-btn-danger"
                              disabled={busyId !== null}
                              onClick={() => setPending({ kind: 'revoke', client, token })}
                            >
                              Cabut
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      {pending && (
        <PasswordConfirmModal
          {...modalCopy(pending)}
          onConfirm={confirmPending}
          onClose={() => setPending(null)}
        />
      )}

      {newToken && (
        <TokenRevealModal
          clientName={newToken.clientName}
          token={newToken.token}
          onClose={() => setNewToken(null)}
        />
      )}

      <SiteFooter />
    </div>
  )
}

function modalCopy(action: PendingAction) {
  const { name } = action.client

  switch (action.kind) {
    case 'enable':
      return {
        title: `Aktifkan ${name}?`,
        message: <p>{name} bisa kembali mengakses SID dengan token yang masih berlaku.</p>,
        confirmLabel: 'Aktifkan',
      }
    case 'rotate':
      return {
        title: `Terbitkan token baru ${name}?`,
        message: (
          <p>
            Token baru hanya ditampilkan sekali. Token lama tetap berlaku sampai Anda mencabutnya,
            jadi {name} bisa berganti token tanpa terputus.
          </p>
        ),
        confirmLabel: 'Terbitkan token',
      }
    case 'revoke':
      return {
        title: `Cabut token ${action.token.name}?`,
        message: (
          <p className="sid-modal-alert-warning">
            Request yang memakai token ini langsung ditolak. Bila {name} belum memakai token
            pengganti, {name} tidak bisa mengakses SID, termasuk mengambil permohonan pedagang baru.
          </p>
        ),
        confirmLabel: 'Cabut token',
        danger: true,
      }
  }
}
