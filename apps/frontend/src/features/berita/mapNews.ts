// Berita dari API dalam bentuk yang dipakai komponen publik.
export type NewsItem = {
  id: number
  title: string
  categories: string[]
  category: string | null
  date: string
  excerpt: string
  imageUrl: string | null
  content: string[]
  isFeatured: boolean
}

// Respons berita mentah; beberapa nama field lama ikut dicoba.
type RawNews = Record<string, unknown> & {
  id?: number
  categories?: ({ name?: string } | null)[]
}

const pick = (obj: RawNews, ...keys: string[]): unknown => {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]
  }
  return null
}

const formatDate = (value: unknown) => {
  if (!value) return ''
  const d = new Date(value as string)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const toParagraphs = (value: unknown): string[] => {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []
  return value
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function mapNews(raw: RawNews): NewsItem {
  const title = pick(raw, 'title', 'judul') as string | null
  if (!title) {
    console.warn('[mapNews] field judul tidak ditemukan. Cek response /api/public/news:', raw)
  }
  // Kategori dari API (1-2 per berita); `category` = yang pertama, untuk
  // kartu yang hanya muat satu chip.
  const categories = Array.isArray(raw.categories)
    ? raw.categories.map((c) => c?.name).filter(Boolean)
    : []
  return {
    id: raw.id,
    title: title ?? '(tanpa judul)',
    categories,
    category: categories[0] ?? (pick(raw, 'category', 'kategori', 'type') as string | null),
    date: formatDate(pick(raw, 'published_at', 'publish_date', 'created_at', 'date')),
    excerpt: (pick(raw, 'excerpt', 'summary', 'description') as string | null) ?? '',
    imageUrl: pick(raw, 'image_url', 'thumbnail_url', 'thumbnail', 'image', 'cover_image') as
      string | null,
    content: toParagraphs(pick(raw, 'content', 'body', 'isi')),
    isFeatured: Boolean(pick(raw, 'is_featured', 'is_main', 'is_headline')),
  }
}
