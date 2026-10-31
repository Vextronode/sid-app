import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  ArrowUpCircle,
  Camera,
  ImageOff,
  Pencil,
  Phone,
  Repeat,
  Trash2,
  UserPlus,
  UserRoundMinus,
  Users,
  UserX,
} from 'lucide-react'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { PageLoader } from '@/components/ui/PageLoader'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { useOrganisasi } from '../hooks/useOrganisasi'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'
import { useConfirmDiscard } from '@/shared/hooks/useConfirmDiscard'
import { isFormDirty } from '@/shared/lib/isFormDirty'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import type {
  AddOrgMemberPayload,
  EndOrgMemberPayload,
  OrgMember,
  OrgPosition,
  OrgSlot,
  OrgSlots,
  UpdateOrgMemberPayload,
} from '../types'

// Isian form Isi/Ganti Ketua atau Wakil Ketua.
type FillForm = {
  slot: OrgSlot
  lockSlot: boolean
  source: 'existing' | 'new'
  from_member_id: string
  member_name: string
  phone_wa: string
  notes: string
  started_at: string
  previous_holder: 'end' | 'to_member'
}

// Data anggota dari MemberForm; started_at hanya untuk anggota baru.
type MemberPayload = UpdateOrgMemberPayload & { started_at?: string }

type MemberFormState = { member_name: string; phone_wa: string; started_at: string; notes: string }

type ModalState =
  | { kind: 'fill'; initial: FillForm }
  | { kind: 'member'; position: OrgPosition; member?: OrgMember }
  | { kind: 'end'; position: OrgPosition; member: OrgMember; toMember: boolean }

type MemberHandler = (member: OrgMember) => void

const LEADER_SLOTS: { key: OrgSlot; label: string }[] = [
  { key: 'ketua', label: 'Ketua' },
  { key: 'wakil_ketua', label: 'Wakil Ketua' },
]

const SLOT_LABEL: Record<OrgSlot, string> = {
  ketua: 'Ketua',
  wakil_ketua: 'Wakil Ketua',
  anggota: 'Anggota',
}

const today = () => new Date().toISOString().slice(0, 10)

const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '-'

const activeOf = (position: OrgPosition | null | undefined) =>
  (position?.members ?? []).filter((m) => m.is_active)
const historyOf = (position: OrgPosition | null | undefined) =>
  (position?.members ?? []).filter((m) => !m.is_active)

const PHOTO_TYPES = 'image/png,image/jpeg,image/webp'

type MemberPhotoProps = {
  src?: string | null
  name?: string | null
  size?: 'tiny' | 'small' | 'medium'
}

function MemberPhoto({ src, name, size = 'tiny' }: MemberPhotoProps) {
  return (
    <div className={`sid-profil-desa-avatar sid-profil-desa-avatar-${size}`}>
      {src ? (
        <img src={src} alt={`Foto ${name ?? 'anggota'}`} className="h-full w-full object-cover" />
      ) : (
        <Users size={size === 'tiny' ? 18 : 24} className="sid-profil-desa-avatar-placeholder" />
      )}
    </div>
  )
}

// Foto opsional di form; pratinjau tampil begitu berkas dipilih.
type PhotoFieldProps = {
  file: File | null
  // Foto tersimpan; kosong untuk anggota baru.
  currentSrc?: string | null
  onChange: (file: File | null) => void
}

function PhotoField({ file, currentSrc, onChange }: PhotoFieldProps) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  return (
    <div className="sid-form-group">
      <label className="sid-form-label" htmlFor="org-member-photo">
        Foto profil
      </label>
      <div className="flex items-center gap-3">
        <MemberPhoto src={preview ?? currentSrc} name="anggota" size="small" />
        <input
          id="org-member-photo"
          type="file"
          accept={PHOTO_TYPES}
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
      </div>
      <small className="sid-admin-cell-meta">Opsional. PNG, JPG, atau WEBP. Maksimal 5 MB.</small>
    </div>
  )
}

// Tombol ganti/hapus foto, dipakai di kartu pimpinan dan tabel anggota.
type PhotoActionsProps = {
  member: OrgMember
  processing: boolean
  onPick: MemberHandler
  onRemove: MemberHandler
}

function PhotoActions({ member, processing, onPick, onRemove }: PhotoActionsProps) {
  return (
    <>
      <button
        type="button"
        className="sid-operator-action detail"
        title={member.photo_img ? 'Ganti foto' : 'Unggah foto'}
        aria-label={`${member.photo_img ? 'Ganti' : 'Unggah'} foto ${member.member_name}`}
        disabled={processing}
        onClick={() => onPick(member)}
      >
        <Camera size={16} />
      </button>
      {member.photo_img && (
        <button
          type="button"
          className="sid-operator-action delete"
          title="Hapus foto"
          aria-label={`Hapus foto ${member.member_name}`}
          disabled={processing}
          onClick={() => onRemove(member)}
        >
          <ImageOff size={16} />
        </button>
      )}
    </>
  )
}

function ModalError({ error }: { error: string | null }) {
  if (!error) return null

  return (
    <p className="sid-admin-alert sid-admin-alert-error" role="alert">
      {error}
    </p>
  )
}

type ModalActionsProps = { submitting: boolean; submitLabel: string; onCancel: () => void }

function ModalActions({ submitting, submitLabel, onCancel }: ModalActionsProps) {
  return (
    <div className="sid-modal-actions">
      <button type="button" className="sid-button sid-button-outline" onClick={onCancel}>
        Batal
      </button>
      <button type="submit" className="sid-button sid-button-primary" disabled={submitting}>
        {submitting ? 'Menyimpan...' : submitLabel}
      </button>
    </div>
  )
}

type HistoryListProps = { members: OrgMember[]; processing: boolean; onDelete: MemberHandler }

function HistoryList({ members, processing, onDelete }: HistoryListProps) {
  if (members.length === 0) return null

  return (
    <details className="sid-org-history">
      <summary>Riwayat ({members.length})</summary>
      <ul>
        {members.map((m) => (
          <li key={m.id}>
            <span>
              {m.member_name}
              <small>
                {formatDate(m.started_at)} – {formatDate(m.ended_at)}
              </small>
            </span>
            <button
              type="button"
              className="sid-operator-action delete"
              title="Hapus riwayat"
              aria-label={`Hapus riwayat ${m.member_name}`}
              disabled={processing}
              onClick={() => onDelete(m)}
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}

type LeaderCardProps = {
  label: string
  position: OrgPosition | null
  processing: boolean
  onFill: () => void
  onEdit: MemberHandler
  onEnd: (member: OrgMember, toMember: boolean) => void
  onDeleteHistory: MemberHandler
  onPickPhoto: MemberHandler
  onRemovePhoto: MemberHandler
}

function LeaderCard({
  label,
  position,
  processing,
  onFill,
  onEdit,
  onEnd,
  onDeleteHistory,
  onPickPhoto,
  onRemovePhoto,
}: LeaderCardProps) {
  const holder = activeOf(position)[0]

  return (
    <article className="sid-org-slot">
      <div className="sid-org-slot-head">
        <span className="sid-org-slot-label">{label}</span>
        {holder && (
          <div className="sid-operator-actions">
            <PhotoActions
              member={holder}
              processing={processing}
              onPick={onPickPhoto}
              onRemove={onRemovePhoto}
            />
            <button
              type="button"
              className="sid-operator-action edit"
              title="Edit data"
              aria-label={`Edit data ${label}`}
              disabled={processing}
              onClick={() => onEdit(holder)}
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              className="sid-operator-action toggle"
              title="Turunkan jadi Anggota"
              aria-label={`Turunkan ${label} jadi Anggota`}
              disabled={processing}
              onClick={() => onEnd(holder, true)}
            >
              <UserRoundMinus size={16} />
            </button>
            <button
              type="button"
              className="sid-operator-action delete"
              title="Kosongkan jabatan"
              aria-label={`Kosongkan jabatan ${label}`}
              disabled={processing}
              onClick={() => onEnd(holder, false)}
            >
              <UserX size={16} />
            </button>
          </div>
        )}
      </div>

      {holder ? (
        <div className="sid-org-slot-body">
          <MemberPhoto src={holder.photo_img} name={holder.member_name} size="medium" />
          <div>
            <p className="sid-org-slot-name">{holder.member_name}</p>
            <p className="sid-org-slot-meta">
              Sejak {formatDate(holder.started_at)}
              {holder.phone_wa && (
                <>
                  {' · '}
                  <Phone size={12} aria-hidden="true" /> {holder.phone_wa}
                </>
              )}
            </p>
            {holder.notes && <p className="sid-org-slot-meta">{holder.notes}</p>}
          </div>
        </div>
      ) : (
        <p className="sid-org-slot-empty">Belum diisi</p>
      )}

      <button
        type="button"
        className={`sid-button ${holder ? 'sid-button-outline' : 'sid-button-primary'}`}
        disabled={processing || !position}
        onClick={onFill}
      >
        {holder ? <Repeat size={16} /> : <UserPlus size={16} />}
        {holder ? `Ganti ${label}` : `Isi ${label}`}
      </button>

      <HistoryList
        members={historyOf(position)}
        processing={processing}
        onDelete={onDeleteHistory}
      />
    </article>
  )
}

// Mengisi/mengganti Ketua atau Wakil Ketua, dari anggota yang sudah ada
// (promosi) atau orang baru.
type FillLeaderFormProps = {
  initial: FillForm
  slots: OrgSlots
  submitting: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (positionId: number, payload: AddOrgMemberPayload, photo: File | null) => void
}

function FillLeaderForm({
  initial,
  slots,
  submitting,
  error,
  onCancel,
  onSubmit,
}: FillLeaderFormProps) {
  const [form, setForm] = useState(initial)
  const [photo, setPhoto] = useState<File | null>(null)
  const requestCancel = useConfirmDiscard(
    isFormDirty({ ...form, photo }, { ...initial, photo: null }),
    {
      disabled: submitting,
      escapeClose: onCancel,
    },
  )

  const target = slots[form.slot]
  const holder = activeOf(target)[0]
  const candidates = (['ketua', 'wakil_ketua', 'anggota'] as OrgSlot[])
    .filter((key) => key !== form.slot)
    .flatMap((key) => activeOf(slots[key]).map((m) => ({ ...m, slotLabel: SLOT_LABEL[key] })))

  const set = (patch: Partial<FillForm>) => setForm((current) => ({ ...current, ...patch }))

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!target) return

    const isExisting = form.source === 'existing'
    // Anggota yang dipromosikan membawa fotonya sendiri.
    onSubmit(
      target.id,
      {
        started_at: form.started_at,
        notes: form.notes || null,
        previous_holder: form.previous_holder,
        ...(isExisting
          ? { from_member_id: Number(form.from_member_id) }
          : { member_name: form.member_name.trim(), phone_wa: form.phone_wa || null }),
      },
      isExisting ? null : photo,
    )
  }

  return (
    <form className="sid-modal" onSubmit={handleSubmit}>
      <h2>{holder ? 'Ganti' : 'Isi'} Pimpinan</h2>

      {initial.lockSlot ? null : (
        <label className="sid-form-group">
          <span className="sid-form-label">Jabatan *</span>
          <select value={form.slot} onChange={(e) => set({ slot: e.target.value as OrgSlot })}>
            {LEADER_SLOTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="sid-form-group">
        <span className="sid-form-label">Diisi oleh</span>
        <div className="sid-org-choice">
          <label>
            <input
              type="radio"
              name="source"
              checked={form.source === 'existing'}
              disabled={candidates.length === 0}
              onChange={() => set({ source: 'existing' })}
            />
            Anggota yang sudah ada
          </label>
          <label>
            <input
              type="radio"
              name="source"
              checked={form.source === 'new'}
              onChange={() => set({ source: 'new' })}
            />
            Orang baru
          </label>
        </div>
      </div>

      {form.source === 'existing' ? (
        <label className="sid-form-group">
          <span className="sid-form-label">Pilih anggota *</span>
          <select
            required
            value={form.from_member_id}
            onChange={(e) => set({ from_member_id: e.target.value })}
          >
            <option value="">Pilih anggota</option>
            {candidates.map((m) => (
              <option key={m.id} value={m.id}>
                {m.member_name} ({m.slotLabel})
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <label className="sid-form-group">
            <span className="sid-form-label">Nama lengkap *</span>
            <input
              required
              maxLength={150}
              value={form.member_name}
              onChange={(e) => set({ member_name: e.target.value })}
            />
          </label>
          <label className="sid-form-group">
            <span className="sid-form-label">Nomor WhatsApp</span>
            <input
              maxLength={20}
              value={form.phone_wa}
              onChange={(e) => set({ phone_wa: e.target.value })}
            />
          </label>
          <PhotoField file={photo} onChange={setPhoto} />
        </>
      )}

      <label className="sid-form-group">
        <span className="sid-form-label">Mulai menjabat *</span>
        <input
          required
          type="date"
          value={form.started_at}
          onChange={(e) => set({ started_at: e.target.value })}
        />
      </label>

      {holder && (
        <div className="sid-form-group">
          <span className="sid-form-label">
            {SLOT_LABEL[form.slot]} saat ini, {holder.member_name}, akan
          </span>
          <div className="sid-org-choice">
            <label>
              <input
                type="radio"
                name="previous_holder"
                checked={form.previous_holder === 'end'}
                onChange={() => set({ previous_holder: 'end' })}
              />
              Selesai menjabat (masuk riwayat)
            </label>
            <label>
              <input
                type="radio"
                name="previous_holder"
                checked={form.previous_holder === 'to_member'}
                onChange={() => set({ previous_holder: 'to_member' })}
              />
              Menjadi Anggota
            </label>
          </div>
        </div>
      )}

      <label className="sid-form-group">
        <span className="sid-form-label">Catatan</span>
        <textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
      </label>

      <ModalError error={error} />
      <ModalActions
        submitting={submitting}
        submitLabel={holder ? 'Ganti' : 'Simpan'}
        onCancel={() => requestCancel(onCancel)}
      />
    </form>
  )
}

// Tambah anggota baru, atau edit data siapa pun (termasuk Ketua/Wakil).
type MemberFormProps = {
  member?: OrgMember
  submitting: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (payload: MemberPayload, photo: File | null) => void
}

function MemberForm({ member, submitting, error, onCancel, onSubmit }: MemberFormProps) {
  const [initialForm] = useState<MemberFormState>(() => ({
    member_name: member?.member_name ?? '',
    phone_wa: member?.phone_wa ?? '',
    started_at: member?.started_at ?? today(),
    notes: member?.notes ?? '',
  }))
  const [form, setForm] = useState(initialForm)
  const [photo, setPhoto] = useState<File | null>(null)
  const requestCancel = useConfirmDiscard(
    isFormDirty({ ...form, photo }, { ...initialForm, photo: null }),
    { disabled: submitting, escapeClose: onCancel },
  )

  const set = (patch: Partial<MemberFormState>) => setForm((current) => ({ ...current, ...patch }))

  return (
    <form
      className="sid-modal"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(
          {
            member_name: form.member_name.trim(),
            phone_wa: form.phone_wa || null,
            notes: form.notes || null,
            ...(member ? {} : { started_at: form.started_at }),
          },
          photo,
        )
      }}
    >
      <h2>{member ? 'Edit Data' : 'Tambah Anggota'}</h2>

      <label className="sid-form-group">
        <span className="sid-form-label">Nama lengkap *</span>
        <input
          required
          maxLength={150}
          value={form.member_name}
          onChange={(e) => set({ member_name: e.target.value })}
        />
      </label>
      <label className="sid-form-group">
        <span className="sid-form-label">Nomor WhatsApp</span>
        <input
          maxLength={20}
          value={form.phone_wa}
          onChange={(e) => set({ phone_wa: e.target.value })}
        />
      </label>
      <PhotoField file={photo} currentSrc={member?.photo_img} onChange={setPhoto} />
      {!member && (
        <label className="sid-form-group">
          <span className="sid-form-label">Mulai menjabat *</span>
          <input
            required
            type="date"
            value={form.started_at}
            onChange={(e) => set({ started_at: e.target.value })}
          />
        </label>
      )}
      <label className="sid-form-group">
        <span className="sid-form-label">Catatan</span>
        <textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
      </label>

      <ModalError error={error} />
      <ModalActions
        submitting={submitting}
        submitLabel="Simpan"
        onCancel={() => requestCancel(onCancel)}
      />
    </form>
  )
}

type EndFormProps = {
  label: string
  member: OrgMember
  toMember: boolean
  submitting: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (payload: EndOrgMemberPayload) => void
}

function EndForm({ label, member, toMember, submitting, error, onCancel, onSubmit }: EndFormProps) {
  const [endedAt, setEndedAt] = useState(today())

  return (
    <form
      className="sid-modal"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({ ended_at: endedAt, to_member: toMember })
      }}
    >
      <h2>{toMember ? 'Turunkan jadi Anggota' : `Kosongkan ${label}`}</h2>
      <p>
        {member.member_name} berhenti sebagai {label}
        {toMember ? ' dan dicatat sebagai Anggota.' : '. Jabatan ini kosong sampai diisi lagi.'}
      </p>

      <label className="sid-form-group">
        <span className="sid-form-label">Tanggal berakhir *</span>
        <input required type="date" value={endedAt} onChange={(e) => setEndedAt(e.target.value)} />
      </label>

      <ModalError error={error} />
      <ModalActions
        submitting={submitting}
        submitLabel={toMember ? 'Turunkan' : 'Kosongkan'}
        onCancel={onCancel}
      />
    </form>
  )
}

/**
 * Struktur organisasi: Ketua dan Wakil Ketua (slot tetap, satu orang,
 * bisa dirotasi) serta Anggota yang jumlahnya bebas.
 *
 * Props:
 *  - title, subtitle
 *  - orgTypes: [{ value: 'bpd', label: 'BPD' }, ...]  (lebih dari satu → tab)
 */
type OrganisasiManagerProps = {
  title: string
  subtitle?: string
  orgTypes: { value: string; label: string }[]
}

export default function OrganisasiManager({ title, subtitle, orgTypes }: OrganisasiManagerProps) {
  const [activeType, setActiveType] = useState(orgTypes[0].value)
  const {
    slots,
    loading,
    error,
    refresh,
    fillSlot,
    editMember,
    endMember,
    removeMember,
    uploadPhoto,
    removePhoto,
  } = useOrganisasi(activeType)

  // Satu input berkas tersembunyi dipakai bersama oleh tombol kamera di
  // kartu pimpinan dan tabel anggota; tujuannya disimpan di ref.
  const photoInput = useRef<HTMLInputElement>(null)
  const photoTarget = useRef<{ position: OrgPosition; member: OrgMember } | null>(null)

  // fill: Isi/Ganti Ketua atau Wakil; member: tambah anggota / edit data;
  // end: akhiri jabatan.
  const [modal, setModal] = useState<ModalState | null>(null)
  const [processing, setProcessing] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const openModal = (next: ModalState) => {
    setFormError(null)
    setModal(next)
  }

  const closeModal = () => {
    setModal(null)
    setFormError(null)
  }

  const run = async (action: () => Promise<unknown>, successMessage: string, fallback: string) => {
    setProcessing(true)
    setFormError(null)
    setActionError(null)
    try {
      await action()
      closeModal()
      notifySuccess(successMessage)
    } catch (err) {
      const message = getApiErrorMessage(err, fallback)
      if (modal) setFormError(message)
      else setActionError(message)
    } finally {
      setProcessing(false)
    }
  }

  const openFill = (
    slot: OrgSlot,
    { fromMemberId, lockSlot = true }: { fromMemberId?: number; lockSlot?: boolean } = {},
  ) =>
    openModal({
      kind: 'fill',
      initial: {
        slot,
        lockSlot,
        source: fromMemberId ? 'existing' : 'new',
        from_member_id: fromMemberId ? String(fromMemberId) : '',
        member_name: '',
        phone_wa: '',
        notes: '',
        started_at: today(),
        previous_holder: 'end',
      },
    })

  const handleDelete = async (position: OrgPosition | null, member: OrgMember, label: string) => {
    if (!position) return
    if (
      !(await confirmDialog({
        title: `Hapus ${label} "${member.member_name}"?`,
        message: 'Tindakan ini tidak dapat dibatalkan.',
        confirmLabel: 'Hapus',
      }))
    )
      return
    run(
      () => removeMember(position.id, member.id),
      'Data berhasil dihapus.',
      'Gagal menghapus data.',
    )
  }

  const pickPhotoFor = (position: OrgPosition | null) => (member: OrgMember) => {
    if (!position) return
    photoTarget.current = { position, member }
    photoInput.current?.click()
  }

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const target = photoTarget.current

    event.target.value = ''
    if (!file || !target) return

    run(
      () => uploadPhoto(target.position.id, target.member.id, file),
      'Foto berhasil disimpan.',
      'Gagal mengunggah foto.',
    )
  }

  const removePhotoOf = (position: OrgPosition | null) => async (member: OrgMember) => {
    if (!position) return
    if (
      !(await confirmDialog({
        title: `Hapus foto "${member.member_name}"?`,
        message: 'Tindakan ini tidak dapat dibatalkan.',
        confirmLabel: 'Hapus',
      }))
    )
      return
    run(
      () => removePhoto(position.id, member.id),
      'Foto berhasil dihapus.',
      'Gagal menghapus foto.',
    )
  }

  const switchType = (value: string) => {
    setActiveType(value)
    setActionError(null)
  }

  const activeLabel = orgTypes.find((t) => t.value === activeType)?.label
  const anggota = slots.anggota
  const activeAnggota = activeOf(anggota)

  return (
    <div className="sid-operator-page">
      <div className="sid-operator-content">
        <p className="sid-operator-breadcrumb">
          Admin / <span>{title}</span>
        </p>

        <div className="sid-operator-header">
          <div>
            <h1>{title}</h1>
            {subtitle && <p className="sid-org-subtitle">{subtitle}</p>}
          </div>
          {/* Memuat ulang lembaga pada tab yang sedang dibuka. */}
          <RefreshButton onRefresh={refresh} disabled={processing} />
        </div>

        {orgTypes.length > 1 && (
          <div className="sid-wilayah-tabs" role="tablist" aria-label="Pilih lembaga">
            {orgTypes.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={t.value === activeType}
                className={`sid-wilayah-tab${t.value === activeType ? ' sid-wilayah-tab-active' : ''}`}
                onClick={() => switchType(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <input
          ref={photoInput}
          type="file"
          accept={PHOTO_TYPES}
          hidden
          aria-label="Unggah foto anggota"
          onChange={handlePhotoChange}
        />

        {actionError && (
          <p className="sid-admin-alert sid-admin-alert-error" role="alert">
            {actionError}
          </p>
        )}

        {loading ? (
          <PageLoader label="Memuat data organisasi..." />
        ) : error ? (
          <p className="sid-admin-alert sid-admin-alert-error" role="alert">
            {error}
          </p>
        ) : (
          <>
            <h2 className="sid-org-section-title">Pimpinan {activeLabel}</h2>
            <div className="sid-org-leaders">
              {LEADER_SLOTS.map((s) => (
                <LeaderCard
                  key={s.key}
                  label={s.label}
                  position={slots[s.key]}
                  processing={processing}
                  onFill={() => openFill(s.key)}
                  onEdit={(member) => {
                    const position = slots[s.key]
                    if (position) openModal({ kind: 'member', position, member })
                  }}
                  onEnd={(member, toMember) => {
                    const position = slots[s.key]
                    if (position) openModal({ kind: 'end', position, member, toMember })
                  }}
                  onDeleteHistory={(member) => handleDelete(slots[s.key], member, 'riwayat')}
                  onPickPhoto={pickPhotoFor(slots[s.key])}
                  onRemovePhoto={removePhotoOf(slots[s.key])}
                />
              ))}
            </div>

            <div className="sid-org-section-head">
              <h2 className="sid-org-section-title">
                Anggota {activeLabel} <span>({activeAnggota.length})</span>
              </h2>
              <button
                type="button"
                className="sid-operator-primary"
                disabled={processing || !anggota}
                onClick={() => anggota && openModal({ kind: 'member', position: anggota })}
              >
                <UserPlus size={16} />
                Tambah Anggota
              </button>
            </div>

            <div className="sid-operator-table-card">
              <div className="sid-operator-table-wrapper">
                <table className="sid-operator-table">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>No. WhatsApp</th>
                      <th className="center">Mulai</th>
                      <th>Catatan</th>
                      <th className="center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAnggota.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="empty">
                          Belum ada anggota. Klik "Tambah Anggota" untuk menambahkan.
                        </td>
                      </tr>
                    ) : (
                      activeAnggota.map((m) => (
                        <tr key={m.id}>
                          <td className="primary-text">
                            <div className="flex items-center gap-3">
                              <MemberPhoto src={m.photo_img} name={m.member_name} />
                              {m.member_name}
                            </div>
                          </td>
                          <td>{m.phone_wa || '-'}</td>
                          <td className="center">{formatDate(m.started_at)}</td>
                          <td>{m.notes || '-'}</td>
                          <td className="center">
                            <div className="sid-operator-actions">
                              <button
                                type="button"
                                className="sid-operator-action detail"
                                title="Jadikan Ketua/Wakil Ketua"
                                aria-label={`Jadikan ${m.member_name} Ketua atau Wakil Ketua`}
                                disabled={processing}
                                onClick={() =>
                                  openFill('ketua', { fromMemberId: m.id, lockSlot: false })
                                }
                              >
                                <ArrowUpCircle size={16} />
                              </button>
                              <PhotoActions
                                member={m}
                                processing={processing}
                                onPick={pickPhotoFor(anggota)}
                                onRemove={removePhotoOf(anggota)}
                              />
                              <button
                                type="button"
                                className="sid-operator-action edit"
                                title="Edit anggota"
                                aria-label={`Edit ${m.member_name}`}
                                disabled={processing}
                                onClick={() =>
                                  anggota &&
                                  openModal({ kind: 'member', position: anggota, member: m })
                                }
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                className="sid-operator-action delete"
                                title="Hapus anggota"
                                aria-label={`Hapus ${m.member_name}`}
                                disabled={processing}
                                onClick={() => handleDelete(anggota, m, 'anggota')}
                              >
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
            </div>

            <HistoryList
              members={historyOf(anggota)}
              processing={processing}
              onDelete={(member) => handleDelete(anggota, member, 'riwayat')}
            />
          </>
        )}
      </div>

      {modal && (
        <div className="sid-modal-overlay">
          {modal.kind === 'fill' && (
            <FillLeaderForm
              initial={modal.initial}
              slots={slots}
              submitting={processing}
              error={formError}
              onCancel={closeModal}
              onSubmit={(positionId, payload, photo) =>
                run(
                  () => fillSlot(positionId, payload, photo),
                  'Pimpinan berhasil disimpan.',
                  'Gagal menyimpan pimpinan.',
                )
              }
            />
          )}

          {modal.kind === 'member' && (
            <MemberForm
              member={modal.member}
              submitting={processing}
              error={formError}
              onCancel={closeModal}
              onSubmit={(payload, photo) =>
                run(
                  () =>
                    modal.member
                      ? editMember(modal.position.id, modal.member.id, payload, photo)
                      : fillSlot(
                          modal.position.id,
                          { ...payload, started_at: payload.started_at ?? today() },
                          photo,
                        ),
                  modal.member ? 'Data berhasil diperbarui.' : 'Anggota berhasil ditambahkan.',
                  'Gagal menyimpan data.',
                )
              }
            />
          )}

          {modal.kind === 'end' && (
            <EndForm
              label={SLOT_LABEL[modal.position.slot]}
              member={modal.member}
              toMember={modal.toMember}
              submitting={processing}
              error={formError}
              onCancel={closeModal}
              onSubmit={(payload) =>
                run(
                  () => endMember(modal.position.id, modal.member.id, payload),
                  modal.toMember ? 'Berhasil diturunkan jadi Anggota.' : 'Jabatan dikosongkan.',
                  'Gagal mengakhiri jabatan.',
                )
              }
            />
          )}
        </div>
      )}

      <SiteFooter />
    </div>
  )
}
