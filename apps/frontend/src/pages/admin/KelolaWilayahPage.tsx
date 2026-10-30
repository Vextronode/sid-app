import { Plus } from 'lucide-react'
import { useState } from 'react'

import { SiteFooter } from '@/components/layout/SiteFooter'

import { useWilayahMaster } from '@/features/kelola-wilayah/hooks/useWilayahMaster'
import DusunTable from '@/features/kelola-wilayah/components/DusunTable'
import RtTable from '@/features/kelola-wilayah/components/RtTable'
import RwTable from '@/features/kelola-wilayah/components/RwTable'
import WilayahFormModal from '@/features/kelola-wilayah/components/WilayahFormModal'
import type {
  WilayahHamlet,
  WilayahItem,
  WilayahPayload,
  WilayahRt,
  WilayahRw,
  WilayahType,
} from '@/features/kelola-wilayah/types'
import WilayahTabs from '@/features/kelola-wilayah/components/WilayahTabs'
import { PageLoader } from '@/components/ui/PageLoader'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'

// Label tombol Tambah per tab.
const TAB_LABELS: Record<WilayahType, string> = { dusun: 'Dusun', rw: 'RW', rt: 'RT' }

// Baris tabel yang dapat diaktifkan/nonaktifkan.
type ToggleItem = { id: number | null; isActive: boolean }

type ModalState = { open: boolean; type: WilayahType | null; item: WilayahItem | null }

export default function KelolaWilayahPage() {
  const {
    hamlets,
    rws,
    rts,
    loading,
    processing,
    error,
    refresh,
    createHamlet,
    updateHamlet,
    deleteHamlet,
    createRw,
    updateRw,
    deleteRw,
    createRt,
    updateRt,
    deleteRt,
  } = useWilayahMaster()

  const [activeTab, setActiveTab] = useState<WilayahType>('dusun')
  const [modal, setModal] = useState<ModalState>({
    open: false,
    type: null,
    item: null,
  })

  const openCreate = (type: WilayahType) => {
    setModal({
      open: true,
      type,
      item: null,
    })
  }

  const openEdit = (type: WilayahType, item: WilayahItem) => {
    setModal({
      open: true,
      type,
      item,
    })
  }

  const closeModal = () => {
    setModal({
      open: false,
      type: null,
      item: null,
    })
  }

  const handleSubmit = async (payload: WilayahPayload) => {
    if (modal.type === 'dusun') {
      if (modal.item?.id) {
        return Boolean(await updateHamlet(modal.item.id, payload))
      }

      return Boolean(await createHamlet(payload))
    }

    if (modal.type === 'rw') {
      if (modal.item?.id) {
        return Boolean(await updateRw(modal.item.id, payload))
      }

      return Boolean(await createRw(payload))
    }

    if (modal.type === 'rt') {
      if (modal.item?.id) {
        return Boolean(await updateRt(modal.item.id, payload))
      }

      return Boolean(await createRt(payload))
    }

    return false
  }

  // Aktif/nonaktif langsung dari baris tabel, dengan konfirmasi.
  const confirmToggle = (item: ToggleItem, label: string) =>
    confirmDialog(
      item.isActive
        ? {
            title: `Nonaktifkan ${label}?`,
            message: 'Wilayah nonaktif tidak dapat dipilih pada data warga baru.',
            confirmLabel: 'Nonaktifkan',
          }
        : {
            title: `Aktifkan ${label}?`,
            message: 'Wilayah dapat dipilih kembali pada data warga.',
            confirmLabel: 'Aktifkan',
            tone: 'primary',
          },
    )

  const toggleWith =
    <T extends ToggleItem>(
      update: (id: number, payload: WilayahPayload) => Promise<unknown>,
      labelOf: (item: T) => string,
    ) =>
    async (item: T) => {
      if (item.id === null) return

      const label = labelOf(item)
      if (!(await confirmToggle(item, label))) return

      if (await update(item.id, { is_active: !item.isActive })) {
        notifySuccess(`${label} berhasil ${item.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`)
      }
    }

  const handleToggleHamlet = toggleWith<WilayahHamlet>(updateHamlet, (item) => `dusun ${item.name}`)
  const handleToggleRw = toggleWith<WilayahRw>(updateRw, (item) => `RW ${item.number}`)
  const handleToggleRt = toggleWith<WilayahRt>(updateRt, (item) => `RT ${item.number}`)

  const handleDeleteHamlet = async (item: WilayahHamlet) => {
    const confirmed = await confirmDialog({
      title: `Hapus dusun "${item.name}"?`,
      message: 'Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Hapus',
    })

    if (!confirmed) return

    if (item.id !== null && (await deleteHamlet(item.id)))
      notifySuccess(`Dusun ${item.name} berhasil dihapus.`)
  }

  const handleDeleteRw = async (item: WilayahRw) => {
    const confirmed = await confirmDialog({
      title: `Hapus RW ${item.number}?`,
      message: 'Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Hapus',
    })

    if (!confirmed) return

    if (item.id !== null && (await deleteRw(item.id)))
      notifySuccess(`RW ${item.number} berhasil dihapus.`)
  }

  const handleDeleteRt = async (item: WilayahRt) => {
    const confirmed = await confirmDialog({
      title: `Hapus RT ${item.number}?`,
      message: 'Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Hapus',
    })

    if (!confirmed) return

    if (item.id !== null && (await deleteRt(item.id)))
      notifySuccess(`RT ${item.number} berhasil dihapus.`)
  }

  const renderTable = () => {
    if (activeTab === 'dusun') {
      return (
        <DusunTable
          hamlets={hamlets}
          rws={rws}
          rts={rts}
          processing={processing}
          onEdit={(item) => openEdit('dusun', item)}
          onToggle={handleToggleHamlet}
          onDelete={handleDeleteHamlet}
        />
      )
    }

    if (activeTab === 'rw') {
      return (
        <RwTable
          rws={rws}
          hamlets={hamlets}
          processing={processing}
          onEdit={(item) => openEdit('rw', item)}
          onToggle={handleToggleRw}
          onDelete={handleDeleteRw}
        />
      )
    }

    return (
      <RtTable
        rts={rts}
        rws={rws}
        hamlets={hamlets}
        processing={processing}
        onEdit={(item) => openEdit('rt', item)}
        onToggle={handleToggleRt}
        onDelete={handleDeleteRt}
      />
    )
  }

  if (loading) {
    return (
      <div className="sid-kelola-wilayah-page">
        <div className="sid-kelola-wilayah-content">
          <PageLoader label="Memuat data wilayah..." />
        </div>

        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="sid-kelola-wilayah-page">
      <div className="sid-kelola-wilayah-content">
        <div className="sid-kelola-wilayah-header">
          <div>
            <span className="sid-kelola-wilayah-eyebrow">Master Data</span>

            <h1>Kelola Wilayah</h1>

            <p>Kelola data Dusun, RW, dan RT dalam satu sumber data wilayah.</p>
          </div>

          <div className="sid-kelola-wilayah-header-actions">
            <RefreshButton onRefresh={() => refresh()} disabled={Boolean(processing)} />

            <button
              type="button"
              onClick={() => openCreate(activeTab)}
              className="sid-wilayah-btn sid-wilayah-btn-primary"
            >
              <Plus size={16} />
              Tambah {TAB_LABELS[activeTab]}
            </button>
          </div>
        </div>

        {error && <div className="sid-kelola-wilayah-error">{error}</div>}

        <div className="sid-kelola-wilayah-summary">
          <div className="sid-kelola-wilayah-summary-card">
            <span>Dusun</span>
            <strong>{hamlets.length}</strong>
          </div>

          <div className="sid-kelola-wilayah-summary-card">
            <span>RW</span>
            <strong>{rws.length}</strong>
          </div>

          <div className="sid-kelola-wilayah-summary-card">
            <span>RT</span>
            <strong>{rts.length}</strong>
          </div>
        </div>

        <WilayahTabs activeTab={activeTab} onChange={setActiveTab} />

        {renderTable()}
      </div>

      <SiteFooter />

      {modal.open && modal.type && (
        <WilayahFormModal
          key={`${modal.type}-${modal.item?.id ?? 'new'}`}
          open={modal.open}
          type={modal.type}
          item={modal.item}
          hamlets={hamlets}
          rws={rws}
          processing={processing}
          error={error}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
