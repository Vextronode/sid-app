import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BellRing, ListOrdered } from 'lucide-react'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { getApprovalFlows } from '@/features/approval/api'
import LetterTypeSettingsPanel from '@/features/surat/components/LetterTypeSettingsPanel'
import ExpiryReminderSettingsPanel from '@/features/surat/components/ExpiryReminderSettingsPanel'
import { SiteFooter } from '@/components/layout/SiteFooter'
import type { ApprovalFlow } from '@/features/approval/api'
import { getApiErrorMessage } from '@/shared/lib/apiError'

const POSITION_LABELS: Record<string, string> = {
  rt: 'Ketua RT',
  kepala_desa: 'Kepala Desa / Sekretaris Desa',
  sekretaris_desa: 'Kepala Desa / Sekretaris Desa',
}

// Siapa yang diberi tahu setelah tahap disetujui (tanpa ikut menyetujui).
const RT_STEP_NOTE = 'Ketua RW dan Kepala Dusun mendapat pemberitahuan.'
const FINAL_STEP_NOTE = 'Surat terbit; Kasi/Kaur sesuai jenis surat mendapat pemberitahuan.'

// Dua bagian halaman, ditampilkan sebagai tab seperti halaman Lembaga
// Kemasyarakatan. Tab aktif disimpan di ?tab= agar tetap saat halaman
// dimuat ulang atau dibuka kembali.
type Section = 'alur' | 'pengingat'

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'alur', label: 'Alur & Jenis Surat' },
  { value: 'pengingat', label: 'Pengingat Masa Berlaku' },
]

/**
 * Semua jenis surat memakai satu alur persetujuan (RT -> Kepala Desa) yang
 * ditetapkan developer. Tab pertama menampilkan alur itu beserta masa berlaku
 * dan petugas per jenis surat; tab kedua mengatur pengingat masa berlaku
 * surat untuk pemohon.
 */
export default function ApprovalFlowsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSection: Section = searchParams.get('tab') === 'pengingat' ? 'pengingat' : 'alur'
  const [flows, setFlows] = useState<ApprovalFlow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Dinaikkan tombol Refresh agar panel pada tab yang terbuka memuat ulang.
  const [reloadKey, setReloadKey] = useState(0)

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

  const switchSection = (value: Section) =>
    setSearchParams(value === 'alur' ? {} : { tab: value }, { replace: true })

  // Memuat ulang tab yang sedang dibuka saja.
  const refresh = () => {
    setReloadKey((key) => key + 1)

    return activeSection === 'alur' ? loadFlows() : undefined
  }

  if (user?.role !== 'staf_sid') {
    return null
  }

  return (
    <div className="sid-operator-page">
      <div className="sid-operator-content">
        <div className="sid-operator-header">
          <div>
            <h1>Alur Persetujuan &amp; Jenis Surat</h1>
            <p>
              Lihat alur persetujuan, atur masa berlaku dan petugas tiap jenis surat, serta
              pengingat masa berlaku surat untuk pemohon.
            </p>
          </div>
          <RefreshButton onRefresh={refresh} />
        </div>

        <div className="sid-wilayah-tabs" role="tablist" aria-label="Pilih bagian">
          {SECTIONS.map((section) => (
            <button
              key={section.value}
              id={`approval-tab-${section.value}`}
              type="button"
              role="tab"
              aria-selected={section.value === activeSection}
              aria-controls={`approval-panel-${section.value}`}
              className={`sid-wilayah-tab${section.value === activeSection ? ' sid-wilayah-tab-active' : ''}`}
              onClick={() => switchSection(section.value)}
            >
              {section.label}
            </button>
          ))}
        </div>

        {activeSection === 'alur' && (
          <div id="approval-panel-alur" role="tabpanel" aria-labelledby="approval-tab-alur">
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <section
              className="sid-card mb-6 overflow-hidden"
              aria-labelledby="approval-flow-heading"
            >
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
                  <div key={flow.id} className="px-5 py-5">
                    {/* Nama alur hanya perlu bila ada lebih dari satu alur. */}
                    {flows.length > 1 && (
                      <p className="mb-3 font-medium text-[var(--sid-text)]">{flow.name}</p>
                    )}
                    <ol className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
                      {(flow.steps ?? []).map((step) => {
                        const note = step.is_final
                          ? FINAL_STEP_NOTE
                          : step.approver_position === 'rt'
                            ? RT_STEP_NOTE
                            : null

                        return (
                          <li
                            key={step.id ?? step.step_order}
                            className="flex flex-col gap-2 rounded-xl border border-[var(--sid-border)] bg-[var(--sid-surface-page)] p-4"
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                                {step.step_order}
                              </span>
                              <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                                Tahap {step.step_order}
                              </span>
                              {step.is_final && (
                                <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                  Persetujuan akhir
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-[var(--sid-text)]">
                              {POSITION_LABELS[step.approver_position] ?? step.approver_position}
                            </p>
                            {note && (
                              <p className="flex items-start gap-1.5 text-sm text-gray-600">
                                <BellRing
                                  size={14}
                                  className="mt-0.5 flex-none text-gray-400"
                                  aria-hidden="true"
                                />
                                {note}
                              </p>
                            )}
                          </li>
                        )
                      })}
                    </ol>
                  </div>
                ))
              )}
            </section>

            <LetterTypeSettingsPanel reloadKey={reloadKey} />
          </div>
        )}

        {activeSection === 'pengingat' && (
          <div
            id="approval-panel-pengingat"
            role="tabpanel"
            aria-labelledby="approval-tab-pengingat"
          >
            <ExpiryReminderSettingsPanel reloadKey={reloadKey} />
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}
