import api from '@/lib/api'
import type { BeritaForm } from './components/BeritaFormModal'
import type { Id, LaravelPaginatedResponse, News, NewsCategory, ResourceResponse } from '@/types'

function buildNewsFormData(payload: BeritaForm, isUpdate = false) {
  const formData = new FormData()

  formData.append('title', payload.title ?? '')
  formData.append('content', payload.content ?? '')

  for (const id of payload.category_ids ?? []) {
    formData.append('category_ids[]', String(id))
  }

  if (payload.thumbnail instanceof File) {
    formData.append('thumbnail', payload.thumbnail, payload.thumbnail.name)
  }

  if (isUpdate) {
    formData.append('_method', 'PATCH')
  }

  return formData
}

export function getBeritaList(params: { page?: number; status?: 'draft' | 'published' } = {}) {
  return api.get<LaravelPaginatedResponse<News>>('/api/news', {
    params,
  })
}

export function createBerita(payload: BeritaForm) {
  return api.post<ResourceResponse<News>>('/api/news', buildNewsFormData(payload))
}

export function updateBerita(id: Id, payload: BeritaForm) {
  const formData = buildNewsFormData(payload, true)

  return api.post(`/api/news/${id}`, formData)
}

export function deleteBerita(id: Id) {
  return api.delete(`/api/news/${id}`)
}

export function publishBerita(id: Id) {
  return api.patch(`/api/news/${id}`, {
    is_published: true,
  })
}

// ==========================================
// KATEGORI BERITA
// ==========================================

export function getNewsCategories() {
  return api.get<ResourceResponse<NewsCategory[]>>('/api/news-categories')
}

export function createNewsCategory(name: string) {
  return api.post('/api/news-categories', { name })
}

export function updateNewsCategory(id: Id, name: string) {
  return api.patch(`/api/news-categories/${id}`, { name })
}

export function deleteNewsCategory(id: Id) {
  return api.delete(`/api/news-categories/${id}`)
}
