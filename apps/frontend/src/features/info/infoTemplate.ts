// Mesin template halaman informasi (infoPagesContent.ts).
//
// - {kunci}        isian halaman (menu Halaman Informasi) atau data desa
//                  ({village.phone}); {a|b} memakai b bila a kosong;
//                  {kunci:date} diformat sebagai tanggal.
// - Token kosong tampil sebagai slot "[LABEL]" (penanda kuning) dengan label
//   dari peta `placeholders` halaman, agar terlihat bagian mana yang belum
//   diisi Staf SIDUTama.
// Hasil render berupa array bagian: teks, { slot: '[LABEL]' }, atau
// { copy, kind: 'phone' | 'email' } untuk telepon/email yang bisa disalin.

const TOKEN = /\{([^}]+)\}/g

export type CopyKind = 'phone' | 'email'

// Satu bagian hasil render: teks, slot "[LABEL]", atau nilai yang bisa disalin.
export type TemplatePart = string | { slot: string } | { copy: string; kind: CopyKind }

// Blok sumber di infoPagesContent.
export type TemplateBlock =
  | { type: 'p' | 'h2' | 'h3'; text: string }
  | { type: 'ul' | 'ol'; items: (string | { list: string })[] }

// Blok siap render.
export type RenderedBlock =
  | { type: 'p' | 'h2' | 'h3'; parts: TemplatePart[] }
  | { type: 'ul' | 'ol'; items: TemplatePart[][] }

// Nilai token: data desa (`village.*`) dan isian halaman informasi.
export type TemplateContext = Record<string, unknown>

// Teks slot per kunci token (teks draf asli), dipakai bila token kosong.
export type TemplatePlaceholders = Record<string, string>

function lookup(context: TemplateContext, path: string) {
  return path.split('.').reduce((value, key) => value?.[key], context)
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function slotFor(key: string, placeholders?: TemplatePlaceholders) {
  return { slot: `[${placeholders?.[key] ?? key.replace(/^village\./, '').toUpperCase()}]` }
}

// Telepon dan email tampil sebagai nilai yang bisa disalin.
function copyKind(path: string): CopyKind | null {
  if (path === 'village.phone') return 'phone'
  if (/email/.test(path)) return 'email'

  return null
}

// Nilai pertama yang terisi: teks biasa, atau { copy, kind } untuk
// telepon/email. null bila semua kosong.
function resolveToken(expression: string, context: TemplateContext): TemplatePart | null {
  const [paths, format] = expression.split(':')

  for (const raw of paths.split('|')) {
    const path = raw.trim()
    const value = lookup(context, path)

    if (typeof value === 'string' && value.trim() !== '') {
      if (format === 'date') return formatDate(value)

      const kind = copyKind(path)
      return kind ? { copy: value.trim(), kind } : value.trim()
    }
  }

  return null
}

/** Teks -> array bagian; token kosong menjadi slot. */
export function renderTemplate(
  text: string,
  context: TemplateContext,
  placeholders?: TemplatePlaceholders,
) {
  const parts: TemplatePart[] = []
  let last = 0

  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last) parts.push(text.slice(last, match.index))

    const value = resolveToken(match[1], context)
    const firstKey = match[1].split(':')[0].split('|')[0].trim()
    parts.push(value ?? slotFor(firstKey, placeholders))

    last = match.index + match[0].length
  }

  if (last < text.length) parts.push(text.slice(last))

  // Teks berurutan digabung agar mudah dibaca dan dites.
  return parts.reduce<TemplatePart[]>((merged, part) => {
    const previous = merged.at(-1)
    if (typeof part === 'string' && typeof previous === 'string') {
      merged[merged.length - 1] = previous + part
    } else {
      merged.push(part)
    }
    return merged
  }, [])
}

/** Apakah bagian hasil render memuat slot (isian yang belum diisi). */
export const hasSlot = (parts: TemplatePart[]) =>
  parts.some((part) => typeof part === 'object' && 'slot' in part)

/**
 * Blok siap render: { type, parts } atau { type, items: [parts] }.
 * Butir daftar { list: 'kunci' } diisi butir isian; bila kosong, satu slot.
 */
export function renderBlocks(
  blocks: TemplateBlock[],
  context: TemplateContext,
  placeholders?: TemplatePlaceholders,
): RenderedBlock[] {
  return blocks.map((block) => {
    // Hanya blok daftar (ul/ol) yang punya items.
    if ('items' in block) {
      const items = block.items.flatMap((item) => {
        if (typeof item === 'string') return [renderTemplate(item, context, placeholders)]

        const values = context[item.list]
        return Array.isArray(values) && values.length > 0
          ? // Isian daftar berupa teks.
            values.map((value) => [value as string])
          : [[slotFor(item.list, placeholders)]]
      })

      return { type: block.type, items }
    }

    return { type: block.type, parts: renderTemplate(block.text, context, placeholders) }
  })
}
