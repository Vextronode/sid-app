/**
 * Syarat tampil isian (visible_when), sama dengan App\Support\FieldCondition
 * di backend:
 *  - { field, equals }  - { field, in: [...] }  - { field, not_in: [...] }
 *  - { field, filled: true|false }
 *  - { any: [syarat, ...] }  - { all: [syarat, ...] }
 * Tanpa syarat selalu terpenuhi.
 */
import type { FieldCondition } from '@/types'
import type { SuratField, SuratFormValues } from '../types'

export function matchesCondition(
  when: FieldCondition | null | undefined,
  values: SuratFormValues = {},
): boolean {
  if (!when || typeof when !== 'object' || Object.keys(when).length === 0) return true

  if (Array.isArray(when.any))
    return when.any.some((condition) => matchesCondition(condition, values))
  if (Array.isArray(when.all))
    return when.all.every((condition) => matchesCondition(condition, values))

  const raw = values[when.field]
  const text = raw === undefined || raw === null || typeof raw === 'object' ? null : String(raw)

  if ('equals' in when) return text === String(when.equals)
  if ('in' in when) return (when.in ?? []).map(String).includes(text)
  if ('not_in' in when) return !(when.not_in ?? []).map(String).includes(text)
  if ('filled' in when) return (text !== null && text.trim() !== '') === Boolean(when.filled)

  return true
}

// Jumlah baris minimal isian repeater (backend: LetterFormSchema::repeaterRules).
export function repeaterMinRows(field: Pick<SuratField, 'min' | 'required'>) {
  return field.min ?? (field.required ? 1 : 0)
}

/**
 * Isian yang tampil untuk jawaban saat ini. Syarat dinilai berurutan
 * terhadap isian yang tampil saja, jadi isian yang bergantung pada isian
 * tersembunyi ikut tersembunyi (LetterFormSchema::visibleFieldNames).
 */
export function visibleFields<
  F extends Pick<SuratField, 'name'> & Partial<Pick<SuratField, 'visibleWhen'>>,
>(fields: F[] = [], values: SuratFormValues = {}): F[] {
  const answers: SuratFormValues = {}

  return fields.filter((field) => {
    if (!matchesCondition(field.visibleWhen, answers)) return false

    if (values[field.name] !== undefined) answers[field.name] = values[field.name]

    return true
  })
}
