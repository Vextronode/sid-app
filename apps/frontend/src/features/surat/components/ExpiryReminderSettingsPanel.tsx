import { useCallback, useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'

import { Switch } from '@/components/ui/Switch'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import { notifyError, notifySuccess } from '@/shared/lib/toast'

import {
  getLetterExpiryReminderSettings,
  updateLetterExpiryReminderSendTime,
  updateLetterExpiryReminderSetting,
} from '../api/letterExpiryReminderSettingApi'
import type { LetterExpiryReminderSetting } from '../api/letterExpiryReminderSettingApi'

function describePoint(daysBefore: number) {
  return daysBefore === 1 ? 'Hari terakhir masa berlaku' : `${daysBefore} hari sebelum kedaluwarsa`
}

// "09:00" -> "09.00", penulisan jam yang lazim di UI berbahasa Indonesia.
function formatTime(value: string) {
  return value.replace(':', '.')
}

/**
 * Kartu A9: Staf SIDUTama mengatur jam kirim dan menyalakan/mematikan titik
 * pengingat masa berlaku (H-30 s.d. H-1) untuk semua jenis surat. Perubahan
 * langsung tersimpan; bila gagal, nilainya kembali ke semula. Hari H selalu
 * dikirim dan tidak bisa diubah.
 */
export default function ExpiryReminderSettingsPanel({ reloadKey = 0 }: { reloadKey?: number }) {
  const [settings, setSettings] = useState<LetterExpiryReminderSetting[]>([])
  const [sendAt, setSendAt] = useState('')
  const [sendAtOptions, setSendAtOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingIds, setSavingIds] = useState<number[]>([])
  const [savingSendAt, setSavingSendAt] = useState(false)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getLetterExpiryReminderSettings()
      const points = Array.isArray(data.points) ? data.points : []
      setSettings([...points].sort((a, b) => b.days_before - a.days_before))
      setSendAt(data.sendAt)
      setSendAtOptions(Array.isArray(data.sendAtOptions) ? data.sendAtOptions : [])
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal memuat pengaturan pengingat masa berlaku.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Muat awal (dan saat Refresh) menyinkronkan state dengan backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSettings()
  }, [loadSettings, reloadKey])

  const setActive = (id: number, isActive: boolean) => {
    setSettings((current) =>
      current.map((setting) => (setting.id === id ? { ...setting, is_active: isActive } : setting)),
    )
  }

  const toggle = async (setting: LetterExpiryReminderSetting, nextActive: boolean) => {
    const label = `H-${setting.days_before}`
    setActive(setting.id, nextActive)
    setSavingIds((ids) => [...ids, setting.id])

    try {
      const updated = await updateLetterExpiryReminderSetting(setting.id, nextActive)
      setSettings((current) =>
        current.map((item) => (item.id === setting.id ? { ...item, ...updated } : item)),
      )
      notifySuccess(`Pengingat ${label} ${nextActive ? 'dinyalakan' : 'dimatikan'}.`)
    } catch (requestError) {
      setActive(setting.id, setting.is_active)
      notifyError(
        getApiErrorMessage(
          requestError,
          `Gagal ${nextActive ? 'menyalakan' : 'mematikan'} pengingat ${label}.`,
        ),
      )
    } finally {
      setSavingIds((ids) => ids.filter((id) => id !== setting.id))
    }
  }

  const changeSendAt = async (nextSendAt: string) => {
    const previous = sendAt
    setSendAt(nextSendAt)
    setSavingSendAt(true)

    try {
      const saved = await updateLetterExpiryReminderSendTime(nextSendAt)
      setSendAt(saved)
      notifySuccess(`Jam kirim pengingat diubah ke ${formatTime(saved)} WIB.`)
    } catch (requestError) {
      setSendAt(previous)
      notifyError(getApiErrorMessage(requestError, 'Gagal mengubah jam kirim pengingat.'))
    } finally {
      setSavingSendAt(false)
    }
  }

  // Nilai tersimpan di luar pilihan (mis. diubah langsung di database) tetap
  // ditampilkan agar dropdown tidak diam-diam menunjuk jam lain.
  const timeOptions =
    sendAt && !sendAtOptions.includes(sendAt) ? [sendAt, ...sendAtOptions] : sendAtOptions

  return (
    <section className="sid-admin-expiry-reminder-panel" aria-labelledby="expiry-reminder-heading">
      <header>
        <BellRing size={18} className="text-blue-600" aria-hidden="true" />
        <div>
          <h2 id="expiry-reminder-heading">Pengingat Masa Berlaku Surat</h2>
          <p>
            Pengingat dikirim ke pemohon sebelum suratnya kedaluwarsa. Berlaku untuk semua jenis
            surat.
          </p>
        </div>
      </header>

      {error && (
        <p className="sid-admin-alert sid-admin-alert-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="sid-admin-expiry-reminder-empty">Memuat pengaturan pengingat...</p>
      ) : error ? null : (
        <>
          <div className="sid-admin-expiry-reminder-send-at">
            <label htmlFor="expiry-reminder-send-at">Jam kirim</label>
            <select
              id="expiry-reminder-send-at"
              value={sendAt}
              disabled={savingSendAt}
              onChange={(event) => void changeSendAt(event.target.value)}
            >
              {timeOptions.map((option) => (
                <option key={option} value={option}>
                  {formatTime(option)} WIB
                </option>
              ))}
            </select>
          </div>

          <ul className="sid-admin-expiry-reminder-list">
            {settings.map((setting) => {
              const nameId = `expiry-reminder-${setting.id}-name`
              const descriptionId = `expiry-reminder-${setting.id}-description`

              return (
                <li key={setting.id}>
                  <span id={nameId} className="sid-admin-expiry-reminder-point">
                    H-{setting.days_before}
                  </span>
                  <span id={descriptionId} className="sid-admin-expiry-reminder-description">
                    {describePoint(setting.days_before)}
                  </span>
                  <Switch
                    checked={setting.is_active}
                    onCheckedChange={(next) => void toggle(setting, next)}
                    labelledBy={nameId}
                    describedBy={descriptionId}
                    disabled={savingIds.includes(setting.id)}
                  />
                </li>
              )
            })}
            <li>
              <span className="sid-admin-expiry-reminder-point">Hari H</span>
              <span className="sid-admin-expiry-reminder-description">Surat sudah kedaluwarsa</span>
              <span className="sid-admin-expiry-reminder-locked">Selalu dikirim</span>
            </li>
          </ul>
        </>
      )}
    </section>
  )
}
