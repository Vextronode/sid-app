import { useEffect, useState } from 'react'
import { Clock, Save } from 'lucide-react'

import { getApprovalSettings, updateApprovalSetting } from '@/features/approval/api'

import {
  APPROVAL_SETTING_LABELS,
  APPROVAL_SETTING_ORDER,
} from '@/features/approval/constants/approvalSetting'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { StatusPill } from '@/components/ui/StatusPill'
import { notifySuccess } from '@/shared/lib/toast'
import type { ApprovalSetting } from '@/features/approval/api'

// Jam batas & pengingat diketik sebagai teks sebelum disimpan.
type SettingRow = Omit<ApprovalSetting, 'deadline_hours' | 'reminder_hours'> & {
  deadline_hours: number | string
  reminder_hours: number | string
}

export default function ApprovalSettingPage() {
  const { user } = useAuth()

  const [settings, setSettings] = useState<SettingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await getApprovalSettings()

        setSettings(response.data?.data ?? [])
      } catch (err) {
        console.error('GET APPROVAL SETTINGS ERROR:', err.response?.data ?? err)

        setError(err.response?.data?.message ?? 'Gagal memuat konfigurasi deadline approval.')
      } finally {
        setLoading(false)
      }
    }

    if (user?.role === 'staf_sid') {
      loadSettings()
    }
  }, [user?.role])

  const handleChange = (id: number, field: 'deadline_hours' | 'reminder_hours', value: string) => {
    setSettings((current) =>
      current.map((setting) =>
        setting.id === id
          ? {
              ...setting,
              [field]: value,
            }
          : setting,
      ),
    )
    setError('')
  }

  const handleSave = async (setting: SettingRow) => {
    const deadlineHours = Number(setting.deadline_hours)
    const reminderHours = Number(setting.reminder_hours)

    if (!Number.isInteger(deadlineHours) || deadlineHours < 1) {
      setError('Batas waktu harus berupa bilangan bulat minimal 1 jam.')
      return
    }

    if (!Number.isInteger(reminderHours) || reminderHours < 0) {
      setError('Reminder harus berupa bilangan bulat minimal 0 jam.')
      return
    }

    if (reminderHours >= deadlineHours) {
      setError('Reminder harus lebih kecil dari deadline.')
      return
    }

    try {
      setSavingId(setting.id)
      setError('')

      const response = await updateApprovalSetting(setting.id, {
        deadline_hours: deadlineHours,
        reminder_hours: reminderHours,
      })

      const updatedSetting = response.data?.data ?? response.data

      setSettings((current) =>
        current.map((item) =>
          item.id === setting.id
            ? {
                ...item,
                ...updatedSetting,
              }
            : item,
        ),
      )

      notifySuccess(
        `Konfigurasi ${APPROVAL_SETTING_LABELS[setting.approval_level]} berhasil disimpan.`,
      )
    } catch (err) {
      console.error('UPDATE APPROVAL SETTING ERROR:', err.response?.data ?? err)

      setError(err.response?.data?.message ?? 'Gagal menyimpan konfigurasi deadline approval.')
    } finally {
      setSavingId(null)
    }
  }

  const orderedSettings = APPROVAL_SETTING_ORDER.map((level) =>
    settings.find((setting) => setting.approval_level === level),
  ).filter((setting): setting is SettingRow => Boolean(setting))

  if (user?.role !== 'staf_sid') {
    return null
  }

  return (
    <div className="sid-desktop-page">
      <div className="sid-page">
        <div className="mb-6">
          <p className="rw-breadcrumb">
            Admin / <span>Pengaturan Batas Waktu</span>
          </p>

          <h1 className="sid-page-title">Pengaturan Batas Waktu Persetujuan</h1>

          <p className="sid-page-description">
            Atur batas waktu proses dan waktu pengingat untuk setiap tahap approval surat. Pengingat
            dikirim sekali ke approver saat sisa waktu tinggal sejumlah jam reminder (0 = tepat saat
            deadline).
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="sid-card overflow-hidden">
          <div className="border-b border-[var(--sid-border)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{
                  background: 'var(--sid-status-progress-bg)',
                  color: 'var(--sid-status-progress-text)',
                }}
              >
                <Clock size={19} />
              </div>

              <div>
                <h2 className="font-medium text-[var(--sid-text)]">Batas Waktu Persetujuan</h2>

                <p className="text-sm text-gray-500">Satuan waktu menggunakan jam.</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-gray-500">
              Memuat konfigurasi...
            </div>
          ) : orderedSettings.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-500">
              Konfigurasi approval belum tersedia.
            </div>
          ) : (
            <div className="divide-y divide-[var(--sid-border)]">
              {orderedSettings.map((setting) => (
                <div
                  key={setting.id}
                  className="grid gap-5 px-5 py-5 md:grid-cols-[1.35fr_1fr_1fr_auto_auto] md:items-end"
                >
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-gray-600">Tahap Persetujuan</p>
                    <p className="text-sm font-medium text-[var(--sid-text)]">
                      {APPROVAL_SETTING_LABELS[setting.approval_level] ?? setting.approval_level}
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-600">
                      Batas Waktu (jam)
                    </span>

                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={setting.deadline_hours}
                        onChange={(event) =>
                          handleChange(setting.id, 'deadline_hours', event.target.value)
                        }
                        className="sid-input w-full pr-14"
                      />

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                        jam
                      </span>
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-600">
                      Reminder Hours (sebelum deadline)
                    </span>

                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={setting.reminder_hours}
                        onChange={(event) =>
                          handleChange(setting.id, 'reminder_hours', event.target.value)
                        }
                        className="sid-input w-full pr-14"
                      />

                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                        jam
                      </span>
                    </div>
                  </label>

                  <div>
                    <p className="mb-1.5 text-xs font-medium text-gray-600">Status</p>
                    <StatusPill active={setting.is_active}>
                      {setting.is_active ? 'Aktif' : 'Nonaktif'}
                    </StatusPill>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSave(setting)}
                    disabled={savingId === setting.id}
                    className="sid-button-primary inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60"
                  >
                    <Save size={16} />

                    {savingId === setting.id ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
