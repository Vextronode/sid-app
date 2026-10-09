import { useState } from 'react'
import { Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'

import { getFamily, getFamilySocioeconomic, saveFamilySocioeconomic } from '../api'

const EMPTY_FAMILY = {
  no_kk: '',
  family_address: '',
  family_status: 'aktif',
}

const EMPTY_SOCIOECONOMIC = {
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

function responseData(response) {
  return response?.data?.data ?? response?.data ?? {}
}

export default function FamilyManagementPanel({ familyList }) {
  const {
    families,
    loading,
    error,
    totalItems,
    searchFamilies,
    currentPage,
    setCurrentPage,
    totalPages,
    addFamily,
    editFamily,
    removeFamily,
  } = familyList
  const [modal, setModal] = useState(null)
  const [familyForm, setFamilyForm] = useState(EMPTY_FAMILY)
  const [socioeconomic, setSocioeconomic] = useState(EMPTY_SOCIOECONOMIC)
  const [selectedFamily, setSelectedFamily] = useState(null)
  const [members, setMembers] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [keyword, setKeyword] = useState('')

  const showError = (err) => {
    setMessage(
      err?.response?.data?.message || err?.message || 'Permintaan gagal. Silakan coba lagi.',
    )
  }

  const openCreate = () => {
    setSelectedFamily(null)
    setFamilyForm(EMPTY_FAMILY)
    setMessage('')
    setModal('family')
  }

  const openEdit = async (family) => {
    setSelectedFamily(family)
    setMembers([])
    setFamilyForm({
      ...EMPTY_FAMILY,
      family_address: family.family_address ?? '',
      family_status: family.family_status ?? 'aktif',
    })
    setMessage('')
    setModal('family')
    try {
      const detail = responseData(await getFamily(family.id))
      setMembers(detail.members ?? [])
    } catch (err) {
      showError(err)
    }
  }

  const openSocioeconomic = async (family) => {
    setSelectedFamily(family)
    setMessage('')
    setModal('socioeconomic')
    setSocioeconomic(EMPTY_SOCIOECONOMIC)
    try {
      const result = responseData(await getFamilySocioeconomic(family.id))
      setSocioeconomic({
        household_income_range: result.household_income_range ?? '',
        house_ownership_status: result.house_ownership_status ?? '',
        water_source: result.water_source ?? '',
        electricity_source: result.electricity_source ?? '',
        dependents_count: result.dependents_count ?? '',
        productive_assets: result.productive_assets
          ? JSON.stringify(result.productive_assets, null, 2)
          : '',
      })
    } catch (err) {
      if (err?.response?.status !== 404) showError(err)
    }
  }

  const handleFamilySubmit = async (event) => {
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
      setModal(null)
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  const handleSocioeconomicSubmit = async (event) => {
    event.preventDefault()
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
      setModal(null)
    } catch (err) {
      showError(err)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (family) => {
    if (!window.confirm(`Hapus data KK ${family.no_kk_masked ?? ''}?`)) return
    try {
      setMessage('')
      await removeFamily(family.id)
    } catch (err) {
      showError(err)
    }
  }

  return (
    <section
      className="sid-operator-table-card sid-admin-family-panel"
      aria-labelledby="families-heading"
    >
      <div className="sid-operator-header" style={{ padding: '20px 20px 0' }}>
        <div>
          <h2 id="families-heading">Kartu Keluarga</h2>
          <p>Kelola data KK dan survei sosio-ekonomi rumah tangga.</p>
        </div>
        <button type="button" className="sid-operator-primary" onClick={openCreate}>
          <Plus size={16} /> Tambah KK
        </button>
      </div>

      <form
        className="sid-operator-filter-card sid-admin-family-search"
        onSubmit={(event) => {
          event.preventDefault()
          searchFamilies(keyword)
        }}
      >
        <label htmlFor="family-search">Cari Nomor Kartu Keluarga</label>

        <div className="sid-operator-search">
          <Search size={16} aria-hidden="true" />
          <input
            id="family-search"
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Masukkan nomor KK..."
            aria-label="Cari nomor Kartu Keluarga"
          />
        </div>
      </form>

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
              <th>No. KK (masked)</th>
              <th>Kepala Keluarga</th>
              <th>Anggota</th>
              <th>Alamat KK</th>
              <th>Status</th>
              <th className="center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="empty">
                  Memuat data kartu keluarga...
                </td>
              </tr>
            ) : families.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">
                  Belum ada data kartu keluarga.
                </td>
              </tr>
            ) : (
              families.map((family) => (
                <tr key={family.id}>
                  <td>{family.no_kk_masked ?? '-'}</td>
                  <td>{family.head_of_family?.name ?? '-'}</td>
                  <td>{family.members_count ?? 0}</td>
                  <td>{family.family_address ?? '-'}</td>
                  <td>{family.family_status ?? '-'}</td>
                  <td className="center">
                    <div className="sid-operator-actions">
                      <button type="button" title="Edit KK" onClick={() => openEdit(family)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        title="Survei sosio-ekonomi"
                        onClick={() => openSocioeconomic(family)}
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button type="button" title="Hapus KK" onClick={() => handleDelete(family)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="sid-operator-pagination">
        <p>
          Menampilkan {families.length} dari {totalItems} data KK
        </p>
        <div>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => page - 1)}
          >
            Sebelumnya
          </button>
          <span>
            {currentPage} / {totalPages}
          </span>
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
                    No. KK: <strong>{selectedFamily.no_kk_masked ?? '-'}</strong>
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
                    <option value="aktif">Aktif</option>
                    <option value="pindah">Pindah</option>
                    <option value="bubar">Bubar</option>
                  </select>
                </label>
                {members.length > 0 && (
                  <div>
                    <strong>Anggota KK</strong>
                    <ul>
                      {members.map((member) => (
                        <li key={member.id}>
                          {member.name} — {member.family_role ?? 'anggota'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <p>
                  KK: <strong>{selectedFamily?.no_kk_masked ?? '-'}</strong>
                </p>
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
                    {['milik_sendiri', 'sewa', 'menumpang', 'dinas'].map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll('_', ' ')}
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
                    {['pdam', 'sumur', 'sungai', 'lainnya'].map((value) => (
                      <option key={value} value={value}>
                        {value.toUpperCase()}
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
                    {['pln', 'non_pln', 'tidak_ada'].map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll('_', ' ').toUpperCase()}
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
                onClick={() => setModal(null)}
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
