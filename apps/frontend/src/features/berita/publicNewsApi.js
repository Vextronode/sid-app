import api from '@/lib/api'
import { publicVillageParams } from '@/shared/lib/api/publicVillageParams'

export function getPublicNews() {
  return api.get('/api/public/news', { params: publicVillageParams() })
}
