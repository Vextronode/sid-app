import api from '@/lib/api'

export function getPublicNews() {
  return api.get('/api/public/news')
}
