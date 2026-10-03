const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]
  }
  return null
}

const formatDate = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const toParagraphs = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []
  return value
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function mapNews(raw) {
  const title = pick(raw, 'title', 'judul')
  if (!title) {
    console.warn('[mapNews] field judul tidak ditemukan. Cek response /api/public/news:', raw)
  }
  return {
    id: raw.id,
    title: title ?? '(tanpa judul)',
    category: pick(raw, 'category', 'kategori', 'type'),
    date: formatDate(pick(raw, 'published_at', 'publish_date', 'created_at', 'date')),
    excerpt: pick(raw, 'excerpt', 'summary', 'description') ?? '',
    imageUrl: pick(raw, 'image_url', 'thumbnail_url', 'thumbnail', 'image', 'cover_image'),
    content: toParagraphs(pick(raw, 'content', 'body', 'isi')),
    isFeatured: Boolean(pick(raw, 'is_featured', 'is_main', 'is_headline')),
  }
}
