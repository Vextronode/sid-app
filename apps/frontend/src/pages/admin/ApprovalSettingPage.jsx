import { useEffect, useState } from 'react'
import { Clock, Save } from 'lucide-react'

import { getApprovalSettings, updateApprovalSetting } from '@/features/approval/api'

import {
  APPROVAL_SETTING_LABELS,
  APPROVAL_SETTING_ORDER,
} from '@/features/approval/constants/approvalSetting'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { FooterDesa } from '@/components/layout/FooterDesa'

export default function ApprovalSettingPage() {
  const { user } = useAuth()

  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [message, setMessage] = useState('')
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

    if (user?.role === 'petugas_desa') {
      loadSettings()
    }
  }, [user?.role])

  const handleChange = (id, field, value) => {
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

    setMessage('')
    setError('')
  }

  const handleSave = async (setting) => {
    const deadlineHours = Number(setting.deadline_hours)
    const reminderHours = Number(setting.reminder_hours)

    if (!Number.isInteger(deadlineHours) || deadlineHours < 1) {
      setError('Deadline harus berupa bilangan bulat minimal 1 jam.')
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
      setMessage('')
      setError('')

      const response = await updateApprovalSetting(setting.id, {
        deadline_hours: deadlineHours,
        reminder_hours: reminderHours,
      })

      const updatedSetting = response.data

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

      setMessage(
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
  ).filter(Boolean)

  if (user?.role !== 'petugas_desa') {
    return null
  }

  return (
    <div className="sid-desktop-page">
      <div className="sid-page">
        <div className="mb-6">
          <p className="rw-breadcrumb">
            Admin / <span>Pengaturan Deadline</span>
          </p>

          <h1 className="sid-page-title">Pengaturan Deadline Approval</h1>

          <p className="sid-page-description">
            Atur batas waktu proses dan waktu pengingat untuk setiap tahap approval surat.
          </p>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

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
                <h2 className="font-medium text-[var(--sid-text)]">Batas Waktu Approval</h2>

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
                  className="grid gap-5 px-5 py-5 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-end"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--sid-text)]">
                      {APPROVAL_SETTING_LABELS[setting.approval_level] ?? setting.approval_level}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">Tahap {setting.approval_level}</p>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-gray-600">Deadline</span>

                    <div className="relative">
                      <input
                        type="number"
                        min="1"
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
                      Pengingat
                    </span>

                    <div className="relative">
                      <input
                        type="number"
                        min="0"
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

                  <button
                    type="button"
                    onClick={() => handleSave(setting)}
                    disabled={savingId === setting.id}
                    className="sid-button-primary inline-flex items-center justify-center gap-2"
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

      <FooterDesa />
    </div>
  )
}
