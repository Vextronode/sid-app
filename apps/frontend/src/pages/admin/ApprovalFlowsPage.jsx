import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Check,
  CirclePlus,
  GitBranch,
  ListOrdered,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  X,
} from 'lucide-react'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import {
  createApprovalFlow,
  getApprovalFlow,
  getApprovalFlows,
  getLetterCategories,
  updateApprovalFlowSteps,
} from '@/features/approval/api'
import { FooterDesa } from '@/components/layout/FooterDesa'

const EMPTY_FLOW_FORM = {
  category_id: '',
  name: '',
  description: '',
  is_active: true,
}

const APPROVER_LABELS = {
  rt: 'RT',
  kepala_desa: 'Kepala Desa / Sekretaris Desa',
  sekdes: 'Sekretaris Desa (legacy)',
}

function getResponseData(response) {
  return response?.data?.data
}

function getErrorMessage(error, fallback) {
  const validationErrors = error?.response?.data?.errors
  const validationMessage = validationErrors
    ? Object.values(validationErrors).flat().filter(Boolean).join(' ')
    : ''

  return validationMessage || error?.response?.data?.message || error?.message || fallback
}

function makeDefaultSteps() {
  return [
    { step_order: 1, approver_position: 'rt', is_final: false },
    { step_order: 2, approver_position: 'kepala_desa', is_final: true },
  ]
}

function normalizeSteps(steps) {
  return (steps ?? [])
    .slice()
    .sort((first, second) => Number(first.step_order) - Number(second.step_order))
    .map((step, index, sortedSteps) => ({
      step_order: index + 1,
      approver_position: step.approver_position === 'sekdes' ? 'kepala_desa' : step.approver_position,
      is_final: index === sortedSteps.length - 1,
    }))
}

export default function ApprovalFlowsPage() {
  const { user } = useAuth()
  const detailRequestId = useRef(0)
  const preferredFlowId = useRef(null)

  const [categories, setCategories] = useState([])
  const [flows, setFlows] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedFlowId, setSelectedFlowId] = useState(null)
  const [selectedFlow, setSelectedFlow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingSteps, setEditingSteps] = useState(false)
  const [draftSteps, setDraftSteps] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_FLOW_FORM)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [String(category.id), category])),
    [categories],
  )

  const visibleFlows = useMemo(
    () =>
      categoryFilter
        ? flows.filter((flow) => String(flow.category_id) === categoryFilter)
        : flows,
    [categoryFilter, flows],
  )

  const loadFlowDetail = useCallback(async (id) => {
    if (!id) return

    const requestId = ++detailRequestId.current
    setSelectedFlowId(id)
    setSelectedFlow(null)
    setDetailLoading(true)
    setEditingSteps(false)
    setError('')

    try {
      const response = await getApprovalFlow(id)
      if (requestId === detailRequestId.current) {
        setSelectedFlow(getResponseData(response))
      }
    } catch (requestError) {
      if (requestId === detailRequestId.current) {
        console.error('GET APPROVAL FLOW DETAIL ERROR:', requestError.response?.data ?? requestError)
        setError(getErrorMessage(requestError, 'Gagal memuat detail flow approval.'))
      }
    } finally {
      if (requestId === detailRequestId.current) {
        setDetailLoading(false)
      }
    }
  }, [])

  const loadPage = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [categoryResponse, flowResponse] = await Promise.all([
        getLetterCategories(),
        getApprovalFlows(categoryFilter || undefined),
      ])
      const categoryData = getResponseData(categoryResponse)
      const flowData = getResponseData(flowResponse)
      const nextCategories = Array.isArray(categoryData) ? categoryData : []
      const nextFlows = Array.isArray(flowData) ? flowData : []

      setCategories(nextCategories)
      setFlows(nextFlows)

      const preferredId = preferredFlowId.current
      const nextSelectedId =
        nextFlows.find((flow) => String(flow.id) === String(preferredId))?.id ?? nextFlows[0]?.id
      preferredFlowId.current = null

      if (nextSelectedId) {
        await loadFlowDetail(nextSelectedId)
      } else {
        setSelectedFlowId(null)
        setSelectedFlow(null)
      }
    } catch (requestError) {
      console.error('GET APPROVAL FLOWS ERROR:', requestError.response?.data ?? requestError)
      setError(getErrorMessage(requestError, 'Gagal memuat konfigurasi flow approval.'))
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, loadFlowDetail])

  useEffect(() => {
    if (user?.role === 'petugas_desa') {
      void Promise.resolve().then(loadPage)
    }
  }, [loadPage, user?.role])

  const openStepEditor = () => {
    setDraftSteps(normalizeSteps(selectedFlow?.steps?.length ? selectedFlow.steps : makeDefaultSteps()))
    setEditingSteps(true)
    setError('')
    setMessage('')
  }

  const updateDraftStep = (index, approverPosition) => {
    setDraftSteps((current) =>
      current.map((step, stepIndex) =>
        stepIndex === index ? { ...step, approver_position: approverPosition } : step,
      ),
    )
  }

  const moveDraftStep = (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= draftSteps.length - 1) return

    setDraftSteps((current) => {
      const next = [...current]
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next.map((step, stepIndex) => ({
        ...step,
        step_order: stepIndex + 1,
        is_final: stepIndex === next.length - 1,
      }))
    })
  }

  const addDraftStep = () => {
    setDraftSteps((current) => {
      const next = [...current]
      const finalStep = next.pop()
      next.push({ step_order: next.length + 1, approver_position: 'rt', is_final: false })
      next.push({ ...finalStep, step_order: next.length + 1, is_final: true })
      return next
    })
  }

  const removeDraftStep = (index) => {
    if (index === draftSteps.length - 1) return

    setDraftSteps((current) =>
      current
        .filter((_, stepIndex) => stepIndex !== index)
        .map((step, stepIndex, next) => ({
          ...step,
          step_order: stepIndex + 1,
          is_final: stepIndex === next.length - 1,
        })),
    )
  }

  const saveSteps = async () => {
    if (!selectedFlow || draftSteps.length === 0) {
      setError('Flow harus memiliki minimal satu step.')
      return
    }

    const steps = draftSteps.map((step, index) => ({
      step_order: index + 1,
      approver_position: index === draftSteps.length - 1 ? 'kepala_desa' : step.approver_position,
      is_final: index === draftSteps.length - 1,
    }))

    try {
      setSaving(true)
      setError('')
      setMessage('')
      await updateApprovalFlowSteps(selectedFlow.id, steps)
      setEditingSteps(false)
      setMessage('Urutan step flow berhasil diperbarui. Perubahan berlaku untuk pengajuan baru.')
      await loadFlowDetail(selectedFlow.id)

      const refreshedFlows = await getApprovalFlows(categoryFilter || undefined)
      setFlows(Array.isArray(getResponseData(refreshedFlows)) ? getResponseData(refreshedFlows) : [])
    } catch (requestError) {
      console.error('UPDATE APPROVAL FLOW STEPS ERROR:', requestError.response?.data ?? requestError)
      setError(getErrorMessage(requestError, 'Gagal menyimpan urutan step flow.'))
    } finally {
      setSaving(false)
    }
  }

  const submitCreateFlow = async (event) => {
    event.preventDefault()

    if (!createForm.category_id || !createForm.name.trim()) {
      setError('Kategori dan nama flow wajib diisi.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setMessage('')
      const response = await createApprovalFlow({
        category_id: Number(createForm.category_id),
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        is_active: createForm.is_active,
      })
      const createdFlow = getResponseData(response)

      setCreateOpen(false)
      setCreateForm(EMPTY_FLOW_FORM)
      preferredFlowId.current = createdFlow.id
      setCategoryFilter('')
      setFlows((current) => [createdFlow, ...current.filter((flow) => flow.id !== createdFlow.id)])
      setMessage('Flow approval berhasil dibuat. Tambahkan atau atur step flow sesuai kebutuhan.')
      await loadFlowDetail(createdFlow.id)
    } catch (requestError) {
      console.error('CREATE APPROVAL FLOW ERROR:', requestError.response?.data ?? requestError)
      setError(getErrorMessage(requestError, 'Gagal membuat flow approval.'))
    } finally {
      setSaving(false)
    }
  }

  if (user?.role !== 'petugas_desa') {
    return null
  }

  return (
    <div className="sid-desktop-page">
      <div className="sid-page">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rw-breadcrumb">
              Admin / <span>Konfigurasi Approval Flow</span>
            </p>
            <h1 className="sid-page-title">Konfigurasi Approval Flow</h1>
            <p className="sid-page-description">
              Kelola flow dan urutan persetujuan untuk kategori surat di desa.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCreateForm({ ...EMPTY_FLOW_FORM, category_id: categories[0]?.id ?? '' })
              setCreateOpen(true)
              setError('')
              setMessage('')
            }}
            className="sid-button-primary inline-flex items-center gap-2"
          >
            <CirclePlus size={17} />
            Tambah Flow
          </button>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}
        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Kategori
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="sid-input min-w-52"
            >
              <option value="">Semua kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void loadPage()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--sid-border)] px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Muat ulang
          </button>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.5fr)]">
          <section className="sid-card overflow-hidden">
            <div className="border-b border-[var(--sid-border)] px-5 py-4">
              <h2 className="font-semibold text-[var(--sid-text)]">Daftar Flow</h2>
              <p className="mt-1 text-xs text-gray-500">{visibleFlows.length} flow</p>
            </div>
            {loading ? (
              <p className="px-5 py-10 text-center text-sm text-gray-500">Memuat daftar flow...</p>
            ) : visibleFlows.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <GitBranch className="mx-auto mb-3 text-gray-400" size={26} />
                <p className="text-sm text-gray-500">Belum ada flow untuk kategori ini.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--sid-border)]">
                {visibleFlows.map((flow) => {
                  const category = categoriesById.get(String(flow.category_id))
                  const isSelected = String(flow.id) === String(selectedFlowId)

                  return (
                    <button
                      type="button"
                      key={flow.id}
                      onClick={() => void loadFlowDetail(flow.id)}
                      className={`block w-full px-5 py-4 text-left transition hover:bg-gray-50 ${
                        isSelected ? 'border-l-4 border-blue-600 bg-blue-50/50' : ''
                      }`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-medium text-[var(--sid-text)]">{flow.name}</span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                            flow.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {flow.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        {category?.name ?? `Kategori #${flow.category_id}`}
                      </span>
                      <span className="mt-2 block text-xs text-gray-500">
                        {flow.steps?.length ?? 0} step
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section className="sid-card overflow-hidden">
            {!selectedFlowId ? (
              <div className="px-5 py-14 text-center text-sm text-gray-500">
                Pilih flow dari daftar untuk melihat detail.
              </div>
            ) : detailLoading ? (
              <div className="px-5 py-14 text-center text-sm text-gray-500">
                Memuat detail flow...
              </div>
            ) : !selectedFlow ? (
              <div className="px-5 py-14 text-center text-sm text-gray-500">
                Detail flow tidak tersedia.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--sid-border)] px-5 py-4">
                  <div>
                    <h2 className="font-semibold text-[var(--sid-text)]">{selectedFlow.name}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {categoriesById.get(String(selectedFlow.category_id))?.name ??
                        `Kategori #${selectedFlow.category_id}`}
                    </p>
                    {selectedFlow.description && (
                      <p className="mt-2 max-w-2xl text-sm text-gray-600">
                        {selectedFlow.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={openStepEditor}
                    disabled={editingSteps}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--sid-border)] px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Pencil size={15} />
                    Edit Step
                  </button>
                </div>

                <div className="px-5 py-5">
                  <div className="mb-4 flex items-center gap-2">
                    <ListOrdered size={18} className="text-blue-600" />
                    <h3 className="font-medium text-[var(--sid-text)]">Urutan Persetujuan</h3>
                  </div>

                  {editingSteps ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500">
                        Step terakhir wajib Kepala Desa. Sekretaris Desa dapat menyetujui pada tahap
                        Kepala Desa sesuai aturan BE.
                      </p>
                      {draftSteps.map((step, index) => {
                        const isFinal = index === draftSteps.length - 1
                        return (
                          <div
                            key={`step-${index}`}
                            className="grid gap-3 rounded-lg border border-[var(--sid-border)] p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                              {index + 1}
                            </span>
                            <label className="min-w-0">
                              <span className="mb-1 block text-xs font-medium text-gray-500">
                                {isFinal ? 'Approver final' : 'Approver'}
                              </span>
                              {isFinal ? (
                                <div className="sid-input flex items-center bg-gray-50 text-sm">
                                  Kepala Desa / Sekretaris Desa
                                </div>
                              ) : (
                                <select
                                  value={step.approver_position}
                                  onChange={(event) => updateDraftStep(index, event.target.value)}
                                  className="sid-input w-full"
                                >
                                  <option value="rt">RT</option>
                                  <option value="kepala_desa">Kepala Desa / Sekretaris Desa</option>
                                </select>
                              )}
                            </label>
                            <div className="flex items-end justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => moveDraftStep(index, -1)}
                                disabled={index === 0 || isFinal}
                                aria-label={`Naikkan step ${index + 1}`}
                                className="rounded-md border p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                              >
                                <ArrowUp size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveDraftStep(index, 1)}
                                disabled={isFinal || index >= draftSteps.length - 2}
                                aria-label={`Turunkan step ${index + 1}`}
                                className="rounded-md border p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                              >
                                <ArrowDown size={15} />
                              </button>
                              {!isFinal && (
                                <button
                                  type="button"
                                  onClick={() => removeDraftStep(index)}
                                  aria-label={`Hapus step ${index + 1}`}
                                  className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                                >
                                  <X size={15} />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      <div className="flex flex-wrap justify-between gap-3 pt-2">
                        <button
                          type="button"
                          onClick={addDraftStep}
                          className="inline-flex items-center gap-2 rounded-lg border border-[var(--sid-border)] px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Plus size={15} />
                          Tambah Step RT
                        </button>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingSteps(false)}
                            disabled={saving}
                            className="rounded-lg border border-[var(--sid-border)] px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveSteps()}
                            disabled={saving || draftSteps.length === 0}
                            className="sid-button-primary inline-flex items-center gap-2"
                          >
                            <Save size={15} />
                            {saving ? 'Menyimpan...' : 'Simpan Step'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : selectedFlow.steps?.length ? (
                    <ol className="space-y-3">
                      {normalizeSteps(selectedFlow.steps).map((step, index) => (
                        <li
                          key={selectedFlow.steps[index]?.id ?? `flow-step-${index}`}
                          className="flex items-center gap-3 rounded-lg border border-[var(--sid-border)] p-3"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-[var(--sid-text)]">
                              {APPROVER_LABELS[step.approver_position] ??
                                step.approver_position.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-gray-500">
                              {step.is_final ? 'Tahap final' : 'Menunggu tahap berikutnya'}
                            </span>
                          </span>
                          {step.is_final && <Check size={17} className="text-green-600" />}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center">
                      <p className="text-sm text-gray-500">Flow ini belum memiliki step approval.</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Tambahkan step untuk menentukan urutan approver.
                      </p>
                    </div>
                  )}

                  <p className="mt-4 text-xs text-gray-500">
                    Penggantian step berlaku untuk pengajuan baru. Surat yang sedang berjalan
                    menggunakan snapshot flow saat diajukan.
                  </p>
                </div>
              </>
            )}
          </section>
        </div>

        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-flow-title"
              className="w-full max-w-xl rounded-xl bg-white shadow-xl"
            >
              <div className="flex items-start justify-between border-b border-[var(--sid-border)] px-5 py-4">
                <div>
                  <h2 id="create-flow-title" className="text-lg font-semibold text-[var(--sid-text)]">
                    Tambah Flow Approval
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">Flow baru dibuat untuk desa Anda.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  aria-label="Tutup form"
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                >
                  <X size={19} />
                </button>
              </div>

              <form onSubmit={submitCreateFlow} className="space-y-4 px-5 py-5">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Kategori surat</span>
                  <select
                    required
                    value={createForm.category_id}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, category_id: event.target.value }))
                    }
                    className="sid-input w-full"
                  >
                    <option value="">Pilih kategori</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Nama flow</span>
                  <input
                    required
                    maxLength={150}
                    value={createForm.name}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, name: event.target.value }))
                    }
                    className="sid-input w-full"
                    placeholder="Contoh: RT - Kades/Sekdes"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi</span>
                  <textarea
                    value={createForm.description}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={3}
                    className="sid-input w-full"
                    placeholder="Keterangan penggunaan flow (opsional)"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={createForm.is_active}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, is_active: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  Flow aktif
                </label>
                <div className="flex justify-end gap-2 border-t border-[var(--sid-border)] pt-4">
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    disabled={saving}
                    className="rounded-lg border border-[var(--sid-border)] px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving || categories.length === 0}
                    className="sid-button-primary inline-flex items-center gap-2"
                  >
                    <CirclePlus size={16} />
                    {saving ? 'Membuat...' : 'Buat Flow'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
        <FooterDesa />
      </div>
    </div>
  )
}
