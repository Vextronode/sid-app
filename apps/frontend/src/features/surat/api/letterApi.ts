import api from '@/lib/api'
import type { Id } from '@/types'

export const deleteLetter = (id: Id) => api.delete(`/api/letters/${id}`)
