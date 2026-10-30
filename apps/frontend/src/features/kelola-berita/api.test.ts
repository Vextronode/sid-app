import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ default: api }))

import {
  createBerita,
  createNewsCategory,
  deleteNewsCategory,
  getNewsCategories,
  updateBerita,
  updateNewsCategory,
} from './api'

describe('news API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends every selected category as category_ids[]', () => {
    createBerita({ title: 'Judul', content: 'Isi', category_ids: [3, 7], thumbnail: null })

    const [url, formData] = api.post.mock.calls[0]
    expect(url).toBe('/api/news')
    expect(formData.getAll('category_ids[]')).toEqual(['3', '7'])
    expect(formData.has('category')).toBe(false)
  })

  it('sends categories on update through a PATCH override', () => {
    updateBerita(5, { title: 'Judul', content: 'Isi', category_ids: [2], thumbnail: null })

    const [url, formData] = api.post.mock.calls[0]
    expect(url).toBe('/api/news/5')
    expect(formData.get('_method')).toBe('PATCH')
    expect(formData.getAll('category_ids[]')).toEqual(['2'])
  })

  it('manages news categories', () => {
    getNewsCategories()
    createNewsCategory('Budaya')
    updateNewsCategory(4, 'Seni Budaya')
    deleteNewsCategory(4)

    expect(api.get).toHaveBeenCalledWith('/api/news-categories')
    expect(api.post).toHaveBeenCalledWith('/api/news-categories', { name: 'Budaya' })
    expect(api.patch).toHaveBeenCalledWith('/api/news-categories/4', { name: 'Seni Budaya' })
    expect(api.delete).toHaveBeenCalledWith('/api/news-categories/4')
  })
})
