// Ringkasan satu kalimat untuk kartu berita beranda, dari hasil mapNews.
// mapNews sendiri tidak diubah karena dipakai halaman berita lain.

export const SUMMARY_MAX_LENGTH = 140

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

const decodeEntities = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const num =
        code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(num) && num > 0 ? String.fromCodePoint(num) : match
    }
    return ENTITIES[code.toLowerCase()] ?? match
  })

export function toPlainText(value) {
  const text = Array.isArray(value) ? value.join(' ') : typeof value === 'string' ? value : ''
  return decodeEntities(
    text.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

const firstSentence = (text) => {
  // Titik di dalam angka ("4.281") tidak dihitung karena tidak diikuti spasi.
  const match = text.match(/^.*?[.!?](?=\s|$)/)
  return match ? match[0] : text
}

const truncate = (text, maxLength) => {
  if (text.length <= maxLength) return text
  const cut = text.slice(0, maxLength - 1)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut
  return `${base.replace(/[\s.,;:!?-]+$/, '')}…`
}

/**
 * Teks polos satu kalimat (≤ maxLength karakter) untuk sebuah berita.
 * Memakai `excerpt` bila ada, selain itu dipotong dari `content`.
 * Mengembalikan '' bila tidak ada teks.
 */
export function summarizeNews(news, maxLength = SUMMARY_MAX_LENGTH) {
  const source = toPlainText(news?.excerpt) || toPlainText(news?.content)
  if (!source) return ''
  return truncate(firstSentence(source), maxLength)
}
