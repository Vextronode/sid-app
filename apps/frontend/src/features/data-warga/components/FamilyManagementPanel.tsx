import { useImperativeHandle, useState } from 'react'
import type { FormEvent, Ref } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Pencil, RefreshCw, Search, Trash2 } from 'lucide-react'

import { getFamily, getFamilySocioeconomic, saveFamilySocioeconomic } from '../api'
import type { useFamilyList } from '../hooks/useFamilyList'
import { WilayahFilterSelects } from './WilayahFilterSelects'
import { PageNumbers } from '@/components/ui/PageNumbers'
import { PageSizeSelect } from '@/components/ui/PageSizeSelect'
import { formatPageRange } from '@/components/ui/pageRange'
import { StatusPill } from '@/components/ui/StatusPill'
import {
  ELECTRICITY_SOURCE_LABELS,
  FAMILY_ROLE_LABELS,
  FAMILY_STATUS_LABELS,
  HOUSE_OWNERSHIP_LABELS,
  WATER_SOURCE_LABELS,
  labelOf,
  optionsOf,
} from '@/shared/lib/labels'
import { confirmDialog } from '@/shared/lib/dialog'
import { useConfirmDiscard } from '@/shared/hooks/useConfirmDiscard'
import { isFormDirty } from '@/shared/lib/isFormDirty'
import { notifySuccess } from '@/shared/lib/toast'
import { getApiErrorMessage, apiErrorStatus } from '@/shared/lib/apiError'
import { RevealableValue } from '@/components/ui/RevealableValue'
import { revealFamilyNumber } from '@/shared/lib/identityApi'
import type { StatusTone } from '@/components/ui/StatusPill'
import type { Family, FamilyMember } from '@/types'

// GET /api/families/{id}/socioeconomic.
type FamilySocioeconomic = {
  household_income_range?: string | null
  house_ownership_status?: string | null
  water_source?: string | null
  electricity_source?: string | null
  dependents_count?: number | string | null
  productive_assets?: unknown
}

const EMPTY_FAMILY = {
  no_kk: '',
  family_address: '',
  family_status: 'aktif',
}

// Warna badge status KK, mengikuti badge Aktif/Nonaktif Manajemen Pengguna.
const FAMILY_STATUS_TONE: Record<string, StatusTone> = {
  aktif: 'active',
  pindah: 'inactive',
  bubar: 'danger',
}

// dependents_count: angka dari API atau teks dari input.
type SocioeconomicForm = {
  household_income_range: string
  house_ownership_status: string
  water_source: string
  electricity_source: string
  dependents_count: number | string
  productive_assets: string
}

const EMPTY_SOCIOECONOMIC: SocioeconomicForm = {
  household_income_range: '',
  house_ownership_status: '',
  water_source: '',
  electricity_source: '',
  dependents_count: '',
  productive_assets: '',
}

const fieldStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--sid-border)',
  background: 'var(--sid-surface-card)',
  color: 'var(--sid-text-primary)',
  fontFamily: 'inherit',
}

// Body { data } atau langsung objeknya; kosong bila tidak ada.
function responseData<T>(response: { data?: unknown }): Partial<T> {
  const body = response?.data as { data?: T } | T | undefined

  return ((body as { data?: T })?.data ?? body ?? {}) as Partial<T>
}

/**
 * Daftar Kartu Keluarga. `canEdit` = false untuk tampilan khusus-baca
 * (Kaur TU & Umum); `canViewHistory` hanya untuk Staf SIDUTama (Log Aktivitas).
 * `ref` mengekspos openCreate() untuk tombol Tambah KK di header halaman.
 */
export type FamilyManagementPanelHandle = { openCreate: () => void }

type FamilyManagementPanelProps = {
  familyList: ReturnType<typeof useFamilyList>
  canEdit?: boolean
  canViewHistory?: boolean
  ref?: Ref<FamilyManagementPanelHandle>
}

export default function FamilyManagementPanel({
  familyList,
  canEdit = true,
  canViewHistory = true,
  ref,
}: FamilyManagementPanelProps) {
  const navigate = useNavigate()
  const {
    families,
    loading,
    error,
    totalItems,
    searchFamilies,
    wilayahFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,
    addFamily,
    editFamily,
    removeFamily,
  } = familyList
  const hasActions = canEdit || canViewHistory
  const columnCount = hasActions ? 6 : 5
  const [modal, setModal] = useState<'family' | 'socioeconomic' | null>(null)
  const [familyForm, setFamilyForm] = useState(EMPTY_FAMILY)
  const [socioeconomic, setSocioeconomic] = useState(EMPTY_SOCIOECONOMIC)
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [keyword, setKeyword] = useState('')
  // Isian saat modal dibuka (atau saat data survei selesai dimuat).
  const [baseline, setBaseline] = useState<typeof EMPTY_FAMILY | SocioeconomicForm | null>(null)

  const closeModal = () => setModal(null)
  const currentForm =
    modal === 'family' ? familyForm : modal === 'socioeconomic' ? socioeconomic : null
  const requestClose = useConfirmDiscard(isFormDirty(currentForm, baseline), {
    disabled: busy,
    escapeClose: modal ? closeModal : null,
  })

  const showError = (err: unknown) => {
    setMessage(getApiErrorMessage(err, 'Permintaan gagal. Silakan coba lagi.'))
  }

  const openCreate = () => {
    setSelectedFamily(null)
    setFamilyForm(EMPTY_FAMILY)
    setBaseline(EMPTY_FAMILY)
    setMessage('')
    setModal('family')
  }

  // Tombol Tambah KK ada di header halaman (sejajar Refresh), di luar panel.
  useImperativeHandle(ref, () => ({ openCreate }))

  const openEdit = async (family: Family) => {
    setSelectedFamily(family)
    setMembers([])
    const initialFamily = {
      ...EMPTY_FAMILY,
      family_address: family.family_address ?? '',
      family_status: family.family_status ?? 'aktif',
    }
    setFamilyForm(initialFamily)
    setBaseline(initialFamily)
    setMessage('')
    setModal('family')
    try {
      const detail = responseData<Family>(await getFamily(family.id))
      setMembers(detail.members ?? [])
    } catch (err) {
      showError(err)
    }
  }

  const openSocioeconomic = async (family: Family) => {
    setSelectedFamily(family)
    setMessage('')
    setModal('socioeconomic')
    setSocioeconomic(EMPTY_SOCIOECONOMIC)
    setBaseline(EMPTY_SOCIOECONOMIC)
    try {
      const result = responseData<FamilySocioeconomic>(await getFamilySocioeconomic(family.id))
      const loaded = {
        household_income_range: result.household_income_range ?? '',
        house_ownership_status: result.house_ownership_status ?? '',
        water_source: result.water_source ?? '',
        electricity_source: result.electricity_source ?? '',
        dependents_count: result.dependents_count ?? '',
        productive_assets: result.productive_assets
          ? JSON.stringify(result.productive_assets, null, 2)
          : '',
      }
      setSocioeconomic(loaded)
      setBaseline(loaded)
    } catch (err) {
      if (apiErrorStatus(err) !== 404) showError(err)
    }
  }

  const handleFamilySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const payload = {
        family_address: familyForm.family_address,
        family_status: familyForm.family_status,
      }
      if (selectedFamily) {
        await editFamily(selectedFamily.id, payload)
      } else {
        await addFamily({ ...payload, no_kk: familyForm.no_kk })
      }
      notifySuccess(
        selectedFamily ? 'Data KK berhasil diperbarui.' : 'KK baru berhasil ditambahkan.',
      )
      setModal(null)
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  const handleSocioeconomicSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedFamily) return
    setBusy(true)
    setMessage('')
    try {
      let productiveAssets = null
      if (socioeconomic.productive_assets.trim()) {
        productiveAssets = JSON.parse(socioeconomic.productive_assets)
        if (
          !productiveAssets ||
          Array.isArray(productiveAssets) ||
          typeof productiveAssets !== 'object'
        ) {
          setMessage('Aset produktif harus berupa JSON object.')
          return
        }
      }
      const payload = Object.fromEntries(
        Object.entries({
          household_income_range: socioeconomic.household_income_range,
          house_ownership_status: socioeconomic.house_ownership_status,
          water_source: socioeconomic.water_source,
          electricity_source: socioeconomic.electricity_source,
          dependents_count:
            socioeconomic.dependents_count === ''
              ? undefined
              : Number(socioeconomic.dependents_count),
          productive_assets: socioeconomic.productive_assets.trim() ? productiveAssets : undefined,
        }).filter(([, value]) => value !== undefined && value !== ''),
      )
      await saveFamilySocioeconomic(selectedFamily.id, payload)
      notifySuccess('Survei sosio-ekonomi berhasil disimpan.')
      setModal(null)
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (family: Family) => {
    if (
      !(await confirmDialog({
        title: `Hapus data KK ${family.no_kk_masked ?? ''}?`,
        message: 'Tindakan ini tidak dapat dibatalkan.',
        confirmLabel: 'Hapus',
      }))
    )
      return
    try {
      setMessage('')
      await removeFamily(family.id)
      notifySuccess('Data KK berhasil dihapus.')
    } catch (err) {
      showError(err)
    }
  }

  return (
    <section
      className="sid-operator-table-card sid-admin-section-panel"
      aria-labelledby="families-heading"
    >
      <div className="sid-operator-header">
        <div>
          <h2 id="families-heading">Kartu Keluarga</h2>
          <p>
            {canEdit
              ? 'Kelola data KK dan survei sosio-ekonomi rumah tangga.'
              : 'Daftar Kartu Keluarga desa (hanya lihat).'}
          </p>
        </div>
      </div>

      {/* Struktur sama dengan filter Data Penduduk: pencarian + Dusun/RW/RT. */}
      <div className="sid-operator-filter-card sid-admin-family-search">
        <form
          className="sid-operator-filter-grid warga-filter"
          onSubmit={(event) => {
            event.preventDefault()
            searchFamilies(keyword)
          }}
        >
          <div className="sid-operator-filter-field">
            <p>Pencarian Cepat</p>
            <div className="sid-operator-search">
              <Search size={16} aria-hidden="true" />
              <input
                id="family-search"
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Cari No. KK (16 digit) atau nama kepala keluarga..."
                aria-label="Cari Kartu Keluarga"
              />
            </div>
          </div>

          <WilayahFilterSelects {...wilayahFilter} />
        </form>
      </div>

      {message && (
        <p className="sid-admin-panel-message sid-admin-alert-error" role="alert">
          {message}
        </p>
      )}
      {error && (
        <p className="sid-admin-panel-message sid-admin-alert-error" role="alert">
          {error}
        </p>
      )}

      <div className="sid-operator-table-wrapper">
        <table className="sid-operator-table">
          <thead>
            <tr>
              <th>No. KK</th>
              <th>Kepala Keluarga</th>
              <th>Anggota</th>
              <th>Alamat KK</th>
              <th>Status</th>
              {hasActions && <th className="center">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columnCount} className="empty">
                  Memuat data kartu keluarga...
                </td>
              </tr>
            ) : families.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="empty">
                  Belum ada data kartu keluarga.
                </td>
              </tr>
            ) : (
              families.map((family) => (
                <tr key={family.id}>
                  <td>
                    <RevealableValue
                      masked={family.no_kk_masked}
                      reveal={() => revealFamilyNumber(family.id)}
                      label="No. KK"
                    />
                  </td>
                  <td>{family.head_of_family?.name ?? '-'}</td>
                  <td>{family.members_count ?? 0}</td>
                  <td>{family.family_address ?? '-'}</td>
                  <td>
                    {family.family_status ? (
                      <StatusPill tone={FAMILY_STATUS_TONE[family.family_status] ?? 'inactive'}>
                        {labelOf(FAMILY_STATUS_LABELS, family.family_status)}
                      </StatusPill>
                    ) : (
                      '-'
                    )}
                  </td>
                  {hasActions && (
                    <td className="center">
                      <div className="sid-operator-actions">
                        {canEdit && (
                          <button
                            type="button"
                            className="sid-operator-action edit"
                            title="Edit KK"
                            aria-label="Edit KK"
                            onClick={() => openEdit(family)}
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            className="sid-operator-action toggle"
                            title="Survei sosio-ekonomi"
                            aria-label="Survei sosio-ekonomi"
                            onClick={() => openSocioeconomic(family)}
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}
                        {canViewHistory && (
                          <button
                            type="button"
                            className="sid-operator-action detail"
                            title="Riwayat perubahan"
                            aria-label="Riwayat perubahan"
                            onClick={() =>
                              navigate(
                                `/admin/log-aktivitas?tab=penduduk&type=family&subject=${encodeURIComponent(family.id)}`,
                              )
                            }
                          >
                            <History size={16} />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            className="sid-operator-action delete"
                            title="Hapus KK"
                            aria-label="Hapus KK"
                            onClick={() => handleDelete(family)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="sid-operator-pagination">
        <div className="sid-pagination-meta">
          <p>{formatPageRange(currentPage, pageSize, totalItems, 'KK')}</p>
          <PageSizeSelect value={pageSize} onChange={setPageSize} />
        </div>
        <div>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => page - 1)}
          >
            Sebelumnya
          </button>
          <PageNumbers
            currentPage={currentPage}
            totalPages={totalPages}
            onChange={setCurrentPage}
          />
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((page) => page + 1)}
          >
            Selanjutnya
          </button>
        </div>
      </div>

      {modal && (
        <div className="sid-modal-overlay">
          <form
            className="sid-modal sid-admin-family-modal"
            onSubmit={modal === 'family' ? handleFamilySubmit : handleSocioeconomicSubmit}
          >
            <h2>
              {modal === 'family'
                ? selectedFamily
                  ? 'Edit Kartu Keluarga'
                  : 'Tambah Kartu Keluarga'
                : 'Survei Sosio-Ekonomi'}
            </h2>
            {modal === 'family' ? (
              <>
                {!selectedFamily && (
                  <label className="sid-form-group">
                    <span className="sid-form-label">Nomor KK *</span>
                    <input
                      style={fieldStyle}
                      required
                      inputMode="numeric"
                      pattern="[0-9]{16}"
                      minLength={16}
                      maxLength={16}
                      value={familyForm.no_kk}
                      onChange={(event) =>
                        setFamilyForm({ ...familyForm, no_kk: event.target.value })
                      }
                    />
                  </label>
                )}
                {selectedFamily && (
                  <p>
                    No. KK:{' '}
                    <strong>
                      <RevealableValue
                        masked={selectedFamily.no_kk_masked}
                        reveal={() => revealFamilyNumber(selectedFamily.id)}
                        label="No. KK"
                      />
                    </strong>
                  </p>
                )}
                <label className="sid-form-group">
                  <span className="sid-form-label">Alamat KK *</span>
                  <textarea
                    style={fieldStyle}
                    required
                    value={familyForm.family_address}
                    onChange={(event) =>
                      setFamilyForm({ ...familyForm, family_address: event.target.value })
                    }
                  />
                </label>
                <label className="sid-form-group">
                  <span className="sid-form-label">Status KK</span>
                  <select
                    style={fieldStyle}
                    value={familyForm.family_status}
                    onChange={(event) =>
                      setFamilyForm({ ...familyForm, family_status: event.target.value })
                    }
                  >
                    {optionsOf(FAMILY_STATUS_LABELS).map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {members.length > 0 && (
                  <div>
                    <strong>Anggota KK</strong>
                    <ul>
                      {members.map((member) => (
                        <li key={member.id}>
                          {member.name} -{' '}
                          {labelOf(FAMILY_ROLE_LABELS, member.family_role ?? 'anggota')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                {selectedFamily && (
                  <p>
                    KK:{' '}
                    <strong>
                      <RevealableValue
                        masked={selectedFamily.no_kk_masked}
                        reveal={() => revealFamilyNumber(selectedFamily.id)}
                        label="No. KK"
                      />
                    </strong>
                  </p>
                )}
                <label className="sid-form-group">
                  <span className="sid-form-label">Rentang Penghasilan Rumah Tangga</span>
                  <select
                    style={fieldStyle}
                    value={socioeconomic.household_income_range}
                    onChange={(event) =>
                      setSocioeconomic({
                        ...socioeconomic,
                        household_income_range: event.target.value,
                      })
                    }
                  >
                    <option value="">Pilih</option>
                    {['<1jt', '1-3jt', '3-5jt', '5-10jt', '>10jt'].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sid-form-group">
                  <span className="sid-form-label">Kepemilikan Rumah</span>
                  <select
                    style={fieldStyle}
                    value={socioeconomic.house_ownership_status}
                    onChange={(event) =>
                      setSocioeconomic({
                        ...socioeconomic,
                        house_ownership_status: event.target.value,
                      })
                    }
                  >
                    <option value="">Pilih</option>
                    {optionsOf(HOUSE_OWNERSHIP_LABELS).map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sid-form-group">
                  <span className="sid-form-label">Sumber Air</span>
                  <select
                    style={fieldStyle}
                    value={socioeconomic.water_source}
                    onChange={(event) =>
                      setSocioeconomic({ ...socioeconomic, water_source: event.target.value })
                    }
                  >
                    <option value="">Pilih</option>
                    {optionsOf(WATER_SOURCE_LABELS).map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sid-form-group">
                  <span className="sid-form-label">Sumber Listrik</span>
                  <select
                    style={fieldStyle}
                    value={socioeconomic.electricity_source}
                    onChange={(event) =>
                      setSocioeconomic({ ...socioeconomic, electricity_source: event.target.value })
                    }
                  >
                    <option value="">Pilih</option>
                    {optionsOf(ELECTRICITY_SOURCE_LABELS).map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sid-form-group">
                  <span className="sid-form-label">Jumlah Tanggungan</span>
                  <input
                    style={fieldStyle}
                    type="number"
                    min="0"
                    value={socioeconomic.dependents_count}
                    onChange={(event) =>
                      setSocioeconomic({ ...socioeconomic, dependents_count: event.target.value })
                    }
                  />
                </label>
                <label className="sid-form-group">
                  <span className="sid-form-label">Aset Produktif (JSON object)</span>
                  <textarea
                    style={fieldStyle}
                    rows={4}
                    value={socioeconomic.productive_assets}
                    onChange={(event) =>
                      setSocioeconomic({ ...socioeconomic, productive_assets: event.target.value })
                    }
                    placeholder='{"kendaraan":"motor"}'
                  />
                </label>
              </>
            )}

            {message && (
              <p className="sid-admin-panel-message sid-admin-alert-error" role="alert">
                {message}
              </p>
            )}
            <div className="sid-modal-actions">
              <button
                type="button"
                className="sid-button sid-button-outline"
                onClick={() => requestClose(closeModal)}
              >
                Batal
              </button>
              <button type="submit" className="sid-button sid-button-primary" disabled={busy}>
                {busy ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
