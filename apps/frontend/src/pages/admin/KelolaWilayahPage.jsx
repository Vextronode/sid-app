import { Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { FooterOperator } from '@/components/layout/FooterOperator'

import { useWilayahMaster } from '@/features/kelola-wilayah/hooks/useWilayahMaster'
import DusunTable from '@/features/kelola-wilayah/components/DusunTable'
import RtTable from '@/features/kelola-wilayah/components/RtTable'
import RwTable from '@/features/kelola-wilayah/components/RwTable'
import WilayahFormModal from '@/features/kelola-wilayah/components/WilayahFormModal'
import WilayahTabs from '@/features/kelola-wilayah/components/WilayahTabs'

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

  const [activeTab, setActiveTab] = useState('dusun')
  const [modal, setModal] = useState({
    open: false,
    type: null,
    item: null,
  })

  const openCreate = (type) => {
    setModal({
      open: true,
      type,
      item: null,
    })
  }

  const openEdit = (type, item) => {
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

  const handleSubmit = async (payload) => {
    if (modal.type === 'dusun') {
      if (modal.item) {
        return Boolean(await updateHamlet(modal.item.id, payload))
      }

      return Boolean(await createHamlet(payload))
    }

    if (modal.type === 'rw') {
      if (modal.item) {
        return Boolean(await updateRw(modal.item.id, payload))
      }

      return Boolean(await createRw(payload))
    }

    if (modal.type === 'rt') {
      if (modal.item) {
        return Boolean(await updateRt(modal.item.id, payload))
      }

      return Boolean(await createRt(payload))
    }

    return false
  }

  const handleDeleteHamlet = async (item) => {
    const confirmed = window.confirm(`Hapus dusun "${item.name}"?`)

    if (!confirmed) return

    await deleteHamlet(item.id)
  }

  const handleDeleteRw = async (item) => {
    const confirmed = window.confirm(`Hapus RW ${item.number}?`)

    if (!confirmed) return

    await deleteRw(item.id)
  }

  const handleDeleteRt = async (item) => {
    const confirmed = window.confirm(`Hapus RT ${item.number}?`)

    if (!confirmed) return

    await deleteRt(item.id)
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
        onDelete={handleDeleteRt}
      />
    )
  }

  if (loading) {
    return (
      <div className="sid-kelola-wilayah-page">
        <div className="sid-kelola-wilayah-content">
          <div className="sid-kelola-wilayah-loading">
            <div className="sid-kelola-wilayah-loading-spinner" />
            <p>Memuat data wilayah...</p>
          </div>
        </div>

        <FooterOperator />
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
            <button
              type="button"
              onClick={() => void refresh()}
              className="sid-wilayah-btn sid-wilayah-btn-secondary"
              disabled={Boolean(processing)}
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => openCreate(activeTab)}
              className="sid-wilayah-btn sid-wilayah-btn-primary"
            >
              <Plus size={16} />
              Tambah {activeTab.toUpperCase() === 'RW' ? 'RW' : activeTab === 'RT' ? 'RT' : 'Dusun'}
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

      <FooterOperator />

      {modal.open && (
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
