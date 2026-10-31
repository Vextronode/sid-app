// Berita desa. Sumber: NewsResource, NewsCategoryResource.
import type { IsoDateString, Uuid } from './api'

export type NewsCategory = {
  id: number
  name: string
  slug: string
  // Hanya pada daftar kategori (whenCounted).
  news_count?: number
  can_delete?: boolean
}

export type News = {
  id: number
  village_id: Uuid
  author_id: Uuid | null
  author_name?: string
  title: string
  slug: string
  content: string
  thumbnail: string | null
  categories?: NewsCategory[]
  is_published: boolean
  published_at: IsoDateString | null
}
