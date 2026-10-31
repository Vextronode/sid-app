import { useCallback, useEffect, useState } from 'react'
import { ListOrdered } from 'lucide-react'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { getApprovalFlows } from '@/features/approval/api'
import LetterTypeSettingsPanel from '@/features/surat/components/LetterTypeSettingsPanel'
import { SiteFooter } from '@/components/layout/SiteFooter'
import type { ApprovalFlow } from '@/features/approval/api'
import { getApiErrorMessage } from '@/shared/lib/apiError'

const POSITION_LABELS: Record<string, string> = {
  rt: 'Ketua RT',
  kepala_desa: 'Kepala Desa / Sekretaris Desa',
  sekretaris_desa: 'Kepala Desa / Sekretaris Desa',
}

/**
 * Semua jenis surat memakai satu alur persetujuan (RT -> Kepala Desa) yang
 * ditetapkan developer. Halaman ini hanya menampilkannya; yang dapat diatur
 * Staf SIDUTama adalah masa berlaku dan petugas per jenis surat.
 */
export default function ApprovalFlowsPage() {
  const { user } = useAuth()
  const [flows, setFlows] = useState<ApprovalFlow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Dinaikkan tombol Refresh agar panel jenis surat ikut memuat ulang.
  const [letterTypesKey, setLetterTypesKey] = useState(0)

  const loadFlows = useCallback(async () => {
    try {
      const response = await getApprovalFlows()
      const data = response?.data?.data

      setFlows(Array.isArray(data) ? data : [])
      setError('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal memuat alur persetujuan.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Muat awal menyinkronkan state dengan data backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFlows()
  }, [loadFlows])

  const refresh = () => {
    setLetterTypesKey((key) => key + 1)

    return loadFlows()
  }

  if (user?.role !== 'staf_sid') {
    return null
  }

  return (
    <div className="sid-operator-page">
      <div className="sid-operator-content">
        <p className="sid-operator-breadcrumb">
          Admin / <span>Alur & Jenis Surat</span>
        </p>
        <div className="sid-operator-header mb-0">
          <h1>Alur Persetujuan &amp; Jenis Surat</h1>
          <RefreshButton onRefresh={refresh} />
        </div>
        <div className="mb-6">
          <p className="sid-page-description">
            Semua jenis surat memakai satu alur persetujuan. RW dan Kadus menerima pemberitahuan
            setelah RT menyetujui; Kasi/Kaur menerima pemberitahuan setelah persetujuan akhir.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <section className="sid-card mb-6 overflow-hidden" aria-labelledby="approval-flow-heading">
          <div className="flex items-center gap-2 border-b border-[var(--sid-border)] px-5 py-4">
            <ListOrdered size={18} className="text-blue-600" />
            <h2 id="approval-flow-heading" className="font-semibold text-[var(--sid-text)]">
              Urutan Persetujuan
            </h2>
          </div>

          {loading ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              Memuat alur persetujuan...
            </p>
          ) : flows.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              Alur persetujuan belum tersedia.
            </p>
          ) : (
            flows.map((flow) => (
              <div key={flow.id} className="px-5 py-4">
                <p className="font-medium text-[var(--sid-text)]">{flow.name}</p>
                {flow.description && (
                  <p className="mt-1 max-w-3xl text-sm text-gray-600">{flow.description}</p>
                )}
                <ol className="mt-3 space-y-2">
                  {(flow.steps ?? []).map((step) => (
                    <li
                      key={step.id ?? step.step_order}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                        {step.step_order}
                      </span>
                      <span>
                        {POSITION_LABELS[step.approver_position] ?? step.approver_position}
                      </span>
                      {step.is_final && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          Persetujuan akhir
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))
          )}
        </section>

        <LetterTypeSettingsPanel reloadKey={letterTypesKey} />
      </div>

      <SiteFooter />
    </div>
  )
}
