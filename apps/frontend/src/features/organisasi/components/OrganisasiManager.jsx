import { useState } from 'react'
import { Plus, Edit, Trash2, X, UserPlus, Repeat, Phone } from 'lucide-react'
import { useOrganisasi } from '../hooks/useOrganisasi'

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  display: 'block',
  marginBottom: 4,
}
const inputStyle = { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #D1D5DB' }
const primaryBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  backgroundColor: '#106D20',
  color: '#fff',
  padding: '8px 14px',
  borderRadius: 8,
  border: 'none',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 13,
}
const ghostBtn = {
  padding: '8px 16px',
  borderRadius: 6,
  border: '1px solid #D1D5DB',
  backgroundColor: '#fff',
  cursor: 'pointer',
}
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: 0 }

const today = () => new Date().toISOString().slice(0, 10)

const getErrorMessage = (err, fallback) => {
  const errs = err?.response?.data?.errors
  return (errs && Object.values(errs)[0]?.[0]) || err?.response?.data?.message || fallback
}

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 10,
          padding: 24,
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button type="button" onClick={onClose} style={iconBtn}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function PositionForm({ initial, submitting, error, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    position_label: initial?.position_label ?? '',
    is_single_occupant: initial?.is_single_occupant ?? true,
    sort_order: initial?.sort_order ?? 0,
    is_active: initial?.is_active ?? true,
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ ...form, sort_order: Number(form.sort_order) || 0 })
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div>
        <label style={labelStyle}>Nama Jabatan</label>
        <input
          required
          maxLength={100}
          value={form.position_label}
          placeholder="Contoh: Ketua"
          onChange={(e) => setForm({ ...form, position_label: e.target.value })}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Urutan Tampil</label>
        <input
          type="number"
          min="0"
          value={form.sort_order}
          onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
          style={inputStyle}
        />
      </div>
      <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={form.is_single_occupant}
          onChange={(e) => setForm({ ...form, is_single_occupant: e.target.checked })}
        />
        Hanya satu pemegang jabatan (mis. Ketua)
      </label>
      <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
        />
        Jabatan aktif
      </label>
      {error && (
        <div
          style={{
            color: '#d32f2f',
            backgroundColor: '#fde8e8',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button type="button" onClick={onCancel} style={ghostBtn}>
          Batal
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{ ...primaryBtn, opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </form>
  )
}

function MemberForm({ position, initial, submitting, error, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    member_name: initial?.member_name ?? '',
    phone_wa: initial?.phone_wa ?? '',
    started_at: initial?.started_at ?? today(),
    notes: initial?.notes ?? '',
  })

  const activeHolder = (position.members ?? []).find((m) => m.is_active)
  const willRotate = !initial && position.is_single_occupant && activeHolder

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          member_name: form.member_name,
          phone_wa: form.phone_wa || null,
          started_at: form.started_at,
          notes: form.notes || null,
        })
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {willRotate && (
        <div
          style={{
            backgroundColor: '#FFF7E6',
            border: '1px solid #F5D08A',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 12,
            color: '#8a5a00',
          }}
        >
          Jabatan ini hanya untuk satu orang. Pemegang saat ini (
          <strong>{activeHolder.member_name}</strong>) akan digantikan.
        </div>
      )}
      <div>
        <label style={labelStyle}>Nama Anggota</label>
        <input
          required
          maxLength={150}
          value={form.member_name}
          placeholder="Nama lengkap"
          onChange={(e) => setForm({ ...form, member_name: e.target.value })}
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>No. WhatsApp</label>
          <input
            maxLength={20}
            value={form.phone_wa}
            placeholder="Opsional"
            onChange={(e) => setForm({ ...form, phone_wa: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Mulai Menjabat</label>
          <input
            type="date"
            required
            value={form.started_at}
            onChange={(e) => setForm({ ...form, started_at: e.target.value })}
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Catatan</label>
        <textarea
          rows={2}
          value={form.notes}
          placeholder="Opsional"
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          style={inputStyle}
        />
      </div>
      {error && (
        <div
          style={{
            color: '#d32f2f',
            backgroundColor: '#fde8e8',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button type="button" onClick={onCancel} style={ghostBtn}>
          Batal
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{ ...primaryBtn, opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </form>
  )
}

/**
 * Props:
 *  - title, subtitle
 *  - orgTypes: [{ value: 'bpd', label: 'BPD' }, ...]  (kalau lebih dari satu, tampil sebagai tab)
 */
export default function OrganisasiManager({ title, subtitle, orgTypes }) {
  const [activeType, setActiveType] = useState(orgTypes[0].value)
  const {
    positions,
    loading,
    error,
    addPosition,
    editPosition,
    removePosition,
    addOrRotateMember,
    editMember,
    removeMember,
  } = useOrganisasi(activeType)

  // modal: null | { kind: 'position', item? } | { kind: 'member', position, item? }
  const [modal, setModal] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const closeModal = () => {
    setModal(null)
    setFormError(null)
  }
  const openModal = (m) => {
    setFormError(null)
    setModal(m)
  }

  const run = async (action, fallback) => {
    setSubmitting(true)
    setFormError(null)
    try {
      await action()
      closeModal()
    } catch (err) {
      setFormError(getErrorMessage(err, fallback))
    } finally {
      setSubmitting(false)
    }
  }

  const submitPosition = (payload) =>
    run(
      () => (modal.item ? editPosition(modal.item.id, payload) : addPosition(payload)),
      'Gagal menyimpan jabatan.',
    )

  const submitMember = (payload) =>
    run(
      () =>
        modal.item
          ? editMember(modal.position.id, modal.item.id, payload)
          : addOrRotateMember(modal.position.id, payload),
      'Gagal menyimpan anggota.',
    )

  const handleDeletePosition = async (p) => {
    if (!window.confirm(`Hapus jabatan "${p.position_label}"?`)) return
    try {
      await removePosition(p.id)
    } catch (err) {
      alert(getErrorMessage(err, 'Gagal menghapus jabatan.'))
    }
  }

  const handleDeleteMember = async (p, m) => {
    if (!window.confirm(`Hapus anggota "${m.member_name}"?`)) return
    try {
      await removeMember(p.id, m.id)
    } catch (err) {
      alert(getErrorMessage(err, 'Gagal menghapus anggota.'))
    }
  }

  const activeLabel = orgTypes.find((t) => t.value === activeType)?.label

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h1>
          {subtitle && (
            <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          style={{ ...primaryBtn, padding: '10px 18px', fontSize: 14 }}
          onClick={() => openModal({ kind: 'position' })}
        >
          <Plus size={18} /> Tambah Jabatan
        </button>
      </div>

      {orgTypes.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {orgTypes.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setActiveType(t.value)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                border: '1px solid #106D20',
                backgroundColor: t.value === activeType ? '#106D20' : '#fff',
                color: t.value === activeType ? '#fff' : '#106D20',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p>Memuat data...</p>
      ) : error ? (
        <div style={{ color: '#d32f2f', backgroundColor: '#fde8e8', padding: 16, borderRadius: 8 }}>
          {error}
        </div>
      ) : positions.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            backgroundColor: '#fff',
            borderRadius: 8,
            border: '1px solid #E5E7EB',
            color: '#6B7280',
          }}
        >
          Belum ada jabatan untuk {activeLabel}. Klik "Tambah Jabatan" untuk memulai.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {positions.map((p) => {
            const members = p.members ?? []
            const active = members.filter((m) => m.is_active)
            const history = members.filter((m) => !m.is_active)
            const isRotate = p.is_single_occupant && active.length > 0

            return (
              <div
                key={p.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{p.position_label}</h3>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>
                      {p.is_single_occupant
                        ? 'Satu pemegang jabatan'
                        : 'Bisa lebih dari satu anggota'}
                      {p.is_active === false && ' · Nonaktif'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      type="button"
                      style={primaryBtn}
                      onClick={() => openModal({ kind: 'member', position: p })}
                    >
                      {isRotate ? <Repeat size={14} /> : <UserPlus size={14} />}
                      {isRotate ? 'Ganti Pemegang' : 'Tambah Anggota'}
                    </button>
                    <button
                      type="button"
                      title="Edit jabatan"
                      style={{ ...iconBtn, color: '#F59E0B' }}
                      onClick={() => openModal({ kind: 'position', item: p })}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      title="Hapus jabatan"
                      style={{ ...iconBtn, color: '#EF4444' }}
                      onClick={() => handleDeletePosition(p)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {active.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
                      Belum ada pemegang jabatan.
                    </p>
                  ) : (
                    active.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#F3F8F3',
                          borderRadius: 8,
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ fontSize: 13 }}>
                          <div style={{ fontWeight: 600 }}>{m.member_name}</div>
                          <div style={{ color: '#6B7280', fontSize: 12 }}>
                            Sejak {m.started_at}
                            {m.phone_wa && (
                              <>
                                {' '}
                                · <Phone size={11} style={{ verticalAlign: 'middle' }} />{' '}
                                {m.phone_wa}
                              </>
                            )}
                          </div>
                          {m.notes && (
                            <div style={{ color: '#6B7280', fontSize: 12 }}>{m.notes}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            type="button"
                            title="Edit anggota"
                            style={{ ...iconBtn, color: '#F59E0B' }}
                            onClick={() => openModal({ kind: 'member', position: p, item: m })}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            type="button"
                            title="Hapus anggota"
                            style={{ ...iconBtn, color: '#EF4444' }}
                            onClick={() => handleDeleteMember(p, m)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {history.length > 0 && (
                    <details style={{ fontSize: 12, color: '#6B7280' }}>
                      <summary style={{ cursor: 'pointer' }}>
                        Riwayat pemegang jabatan ({history.length})
                      </summary>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                        {history.map((m) => (
                          <li key={m.id}>
                            {m.member_name} ({m.started_at} s/d {m.ended_at ?? '-'})
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal?.kind === 'position' && (
        <Modal
          title={modal.item ? 'Edit Jabatan' : `Tambah Jabatan ${activeLabel}`}
          onClose={closeModal}
        >
          <PositionForm
            initial={modal.item}
            submitting={submitting}
            error={formError}
            onCancel={closeModal}
            onSubmit={submitPosition}
          />
        </Modal>
      )}

      {modal?.kind === 'member' && (
        <Modal
          title={
            modal.item
              ? 'Edit Anggota'
              : `${modal.position.is_single_occupant && (modal.position.members ?? []).some((m) => m.is_active) ? 'Ganti Pemegang' : 'Tambah Anggota'} · ${modal.position.position_label}`
          }
          onClose={closeModal}
        >
          <MemberForm
            position={modal.position}
            initial={modal.item}
            submitting={submitting}
            error={formError}
            onCancel={closeModal}
            onSubmit={submitMember}
          />
        </Modal>
      )}
    </div>
  )
}
