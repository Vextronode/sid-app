import api from '@/lib/api'

export const deleteLetter = (id) => api.delete(`/api/letters/${id}`)
