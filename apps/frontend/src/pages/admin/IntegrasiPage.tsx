import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Plug, Power, PowerOff, Trash2 } from 'lucide-react'
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
    <div className="sid-kelola-wilayah-page">
      <div className="sid-kelola-wilayah-content">
        <div className="sid-kelola-wilayah-header">
          <div>
            <h1>Integrasi</h1>
            <p>
              Aplikasi lain yang terhubung ke SID lewat token, misalnya Cimart dan SIGAP. Di sini
              Anda bisa menonaktifkan aplikasi, menerbitkan token baru, dan mencabut token. Menambah
              aplikasi dan mengubah hak aksesnya dilakukan tim teknis di server.
            </p>
          </div>

          <div className="sid-kelola-wilayah-header-actions">
            <RefreshButton onRefresh={load} refreshing={loading} />
          </div>
        </div>

        {error && (
          <div className="sid-kelola-wilayah-error" role="alert">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {clients.length === 0 && (
            <div className="sid-wilayah-table-card">
              <div className="sid-wilayah-empty">
                {loading ? 'Memuat data...' : 'Belum ada aplikasi yang terhubung.'}
              </div>
            </div>
          )}

          {clients.map((client) => (
            <section
              key={client.id}
              className="sid-wilayah-table-card"
              aria-labelledby={`integration-client-${client.id}`}
            >
              <div className="sid-wilayah-table-toolbar">
                <div className="min-w-0">
                  <h3 id={`integration-client-${client.id}`} className="flex items-center gap-2">
                    <Plug size={18} aria-hidden="true" />
                    {client.name}
                    <StatusPill active={client.is_active}>
                      {client.is_active ? 'Aktif' : 'Nonaktif'}
                    </StatusPill>
                  </h3>
                  <p>
                    Hak akses:{' '}
                    {client.abilities.length === 0
                      ? '-'
                      : client.abilities.map((ability) => ability.label).join(', ')}
                    . Terakhir dipakai: {lastUsed(client.last_used_at)}.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {client.is_active ? (
                    <button
                      type="button"
                      className="sid-wilayah-btn sid-wilayah-btn-secondary"
                      disabled={busyId !== null}
                      onClick={() => disable(client)}
                    >
                      <PowerOff size={15} aria-hidden="true" />
                      {busyId === client.id ? 'Memproses...' : 'Nonaktifkan'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="sid-wilayah-btn sid-wilayah-btn-secondary"
                      disabled={busyId !== null}
                      onClick={() => setPending({ kind: 'enable', client })}
                    >
                      <Power size={15} aria-hidden="true" />
                      Aktifkan
                    </button>
                  )}
                  <button
                    type="button"
                    className="sid-wilayah-btn sid-wilayah-btn-primary"
                    disabled={busyId !== null}
                    onClick={() => setPending({ kind: 'rotate', client })}
                  >
                    <KeyRound size={15} aria-hidden="true" />
                    Terbitkan token baru
                  </button>
                </div>
              </div>

              <div className="sid-wilayah-table-wrap">
                <table className="sid-wilayah-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Diterbitkan</th>
                      <th>Terakhir Dipakai</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.tokens.length === 0 ? (
                      <tr>
                        <td colSpan={4}>
                          <div className="sid-wilayah-empty">
                            Tidak ada token aktif. {client.name} tidak bisa terhubung sampai token
                            baru diterbitkan.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      client.tokens.map((token, index) => (
                        <tr key={token.id}>
                          <td className="center">
                            <span className="font-semibold">{token.name}</span>{' '}
                            <StatusPill tone={index === 0 ? 'active' : 'warning'}>
                              {index === 0 ? 'Terbaru' : 'Token lama'}
                            </StatusPill>
                          </td>
                          <td className="center">{formatDateTime(token.created_at)}</td>
                          <td className="center">{lastUsed(token.last_used_at)}</td>
                          <td className="center">
                            <button
                              type="button"
                              className="sid-wilayah-btn sid-wilayah-btn-danger"
                              disabled={busyId !== null}
                              onClick={() => setPending({ kind: 'revoke', client, token })}
                            >
                              <Trash2 size={15} aria-hidden="true" />
                              Cabut
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <p className="m-0 border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
                Token lama tetap berlaku setelah token baru diterbitkan. Cabut token lama setelah
                token baru terlihat dipakai. Bila token bocor, cabut segera lalu terbitkan token
                baru.
              </p>
            </section>
          ))}
        </div>
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
