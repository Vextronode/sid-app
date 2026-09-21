import api from '@/lib/api'

function buildNewsFormData(payload, isUpdate = false) {
  const formData = new FormData()

  formData.append('title', payload.title ?? '')
  formData.append('content', payload.content ?? '')

  if (payload.category) {
    formData.append('category', payload.category)
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

  console.log('=== UPDATE BERITA ===')

  for (const [key, value] of formData.entries()) {
    console.log(
      key,
      value instanceof File
        ? {
            name: value.name,
            type: value.type,
            size: value.size,
          }
        : value,
    )
  }

  console.log('====================')

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
