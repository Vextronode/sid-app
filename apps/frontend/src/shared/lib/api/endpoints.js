import { apiClient } from './client';

export const suratApi = {
  getLetterTypes: () => apiClient.get('/api/letter-types?active=true').then((r) => r.data),
  getLetterDetail: (id) => apiClient.get(`/api/letters/${id}`).then((r) => r.data),
  submitLetter: (payload) => apiClient.post('/api/letters', payload).then((r) => r.data),
  getMyLetters: (params) => apiClient.get('/api/letters', { params }).then((r) => r.data),
};