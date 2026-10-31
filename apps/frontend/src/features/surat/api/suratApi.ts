import api from '@/lib/api'
import type { Letter, MessageResponse } from '@/types'

export const submitSurat = async (formData: FormData) => {
  const response = await api.post<MessageResponse<Letter>>('/api/letters', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}
