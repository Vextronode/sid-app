import api from '@/lib/api'

function buildNewsFormData(payload, isUpdate = false) {
  const formData = new FormData()

  formData.append('title', payload.title ?? '')
  formData.append('content', payload.content ?? '')

  for (const id of payload.category_ids ?? []) {
    formData.append('category_ids[]', id)
  }

  if (payload.thumbnail instanceof File) {
    formData.append('thumbnail', payload.thumbnail, payload.thumbnail.name)
  }

  if (isUpdate) {
    formData.append('_method', 'PATCH')
  }

  return formData
}

export function getBeritaList(params = {}) {
  return api.get('/api/news', {
    params,
  })
}

export function createBerita(payload) {
  return api.post('/api/news', buildNewsFormData(payload))
}

export function updateBerita(id, payload) {
  const formData = buildNewsFormData(payload, true)

  return api.post(`/api/news/${id}`, formData)
}

export function deleteBerita(id) {
  return api.delete(`/api/news/${id}`)
}

export function publishBerita(id) {
  return api.patch(`/api/news/${id}`, {
    is_published: true,
  })
}

// ==========================================
// KATEGORI BERITA
// ==========================================

export function getNewsCategories() {
  return api.get('/api/news-categories')
}

export function createNewsCategory(name) {
  return api.post('/api/news-categories', { name })
}

export function updateNewsCategory(id, name) {
  return api.patch(`/api/news-categories/${id}`, { name })
}

export function deleteNewsCategory(id) {
  return api.delete(`/api/news-categories/${id}`)
}
