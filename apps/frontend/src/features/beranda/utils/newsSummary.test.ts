import { describe, expect, it } from 'vitest'
import { SUMMARY_MAX_LENGTH, summarizeNews, toPlainText } from './newsSummary'

describe('toPlainText', () => {
  it('removes HTML tags, scripts, and entities', () => {
    const html =
      '<p>Warga&nbsp;<b>Cibenda</b> &amp; RT 03</p><script>alert(1)</script><style>p{}</style>'

    expect(toPlainText(html)).toBe('Warga Cibenda & RT 03')
  })

  it('joins paragraph arrays from mapNews', () => {
    expect(toPlainText(['Paragraf satu.', 'Paragraf dua.'])).toBe('Paragraf satu. Paragraf dua.')
  })

  it('returns an empty string for missing values', () => {
    expect(toPlainText(undefined)).toBe('')
    expect(toPlainText(null)).toBe('')
    expect(toPlainText(42)).toBe('')
  })
})

describe('summarizeNews', () => {
  it('takes the first sentence of the content', () => {
    const news = {
      excerpt: '',
      content: ['<p>Revitalisasi mata air dimulai hari ini. Warga diminta hadir.</p>'],
    }

    expect(summarizeNews(news)).toBe('Revitalisasi mata air dimulai hari ini.')
  })

  it('does not split on dots inside numbers', () => {
    const news = { content: ['Jumlah penduduk mencapai 4.281 jiwa. Data diperbarui.'] }

    expect(summarizeNews(news)).toBe('Jumlah penduduk mencapai 4.281 jiwa.')
  })

  it('prefers the excerpt when present', () => {
    const news = { excerpt: '<em>Ringkasan</em> dari admin.', content: ['Isi berita panjang.'] }

    expect(summarizeNews(news)).toBe('Ringkasan dari admin.')
  })

  it('falls back to content when the excerpt is only markup', () => {
    const news = { excerpt: '<p> </p>', content: ['Isi berita.'] }

    expect(summarizeNews(news)).toBe('Isi berita.')
  })

  it('cuts long sentences at a word boundary within the limit', () => {
    const word = 'pembangunan '
    const news = { content: [word.repeat(30).trim()] }
    const summary = summarizeNews(news)

    expect(summary.length).toBeLessThanOrEqual(SUMMARY_MAX_LENGTH)
    expect(summary.endsWith('pembangunan…')).toBe(true)
  })

  it('cuts a single very long word without exceeding the limit', () => {
    const summary = summarizeNews({ content: ['a'.repeat(500)] })

    expect(summary).toHaveLength(SUMMARY_MAX_LENGTH)
    expect(summary.endsWith('…')).toBe(true)
  })

  it('keeps short text unchanged', () => {
    expect(summarizeNews({ content: 'Tanpa titik di akhir' })).toBe('Tanpa titik di akhir')
  })

  it('returns an empty string when there is no text', () => {
    expect(summarizeNews(undefined)).toBe('')
    expect(summarizeNews({})).toBe('')
    expect(summarizeNews({ excerpt: '', content: [] })).toBe('')
    expect(summarizeNews({ content: ['<img src="x.jpg">'] })).toBe('')
  })
})
