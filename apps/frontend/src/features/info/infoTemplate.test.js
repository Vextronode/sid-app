import { describe, expect, it } from 'vitest'

import { hasSlot, renderBlocks, renderTemplate } from './infoTemplate'

const context = {
  copy_fee: 'Rp500 per lembar',
  empty: '  ',
  contact_email: null,
  village: { name: 'Desa Cibenda', email: 'kantor@desa.test', phone: null },
  list: ['Satu', 'Dua'],
  emptyList: [],
}

const placeholders = { 'village.phone': 'TELEPON DESA', emptyList: 'DAFTAR' }

describe('renderTemplate', () => {
  it('fills tokens from fields and village data', () => {
    expect(renderTemplate('Kantor {village.name}, biaya {copy_fee}.', context)).toEqual([
      'Kantor Desa Cibenda, biaya Rp500 per lembar.',
    ])
  })

  it('turns an empty token into a [placeholder] slot, keeping the sentence', () => {
    const parts = renderTemplate('Telepon {village.phone} atau {empty}.', context, placeholders)

    expect(parts).toEqual([
      'Telepon ',
      { slot: '[TELEPON DESA]' },
      ' atau ',
      { slot: '[EMPTY]' },
      '.',
    ])
    expect(hasSlot(parts)).toBe(true)
  })

  it('falls back to the next value with | before showing a slot', () => {
    expect(renderTemplate('Email {contact_email|village.email}', context)).toEqual([
      'Email ',
      { copy: 'kantor@desa.test', kind: 'email' },
    ])
  })

  it('marks phone numbers and emails as copyable values', () => {
    expect(
      renderTemplate('Telepon {village.phone}', { village: { phone: '(0265) 2640613' } }),
    ).toEqual(['Telepon ', { copy: '(0265) 2640613', kind: 'phone' }])
    expect(hasSlot([{ copy: 'x', kind: 'email' }])).toBe(false)
  })

  it('formats dates', () => {
    expect(renderTemplate('Sejak {d:date}', { d: '2026-11-01' })).toEqual(['Sejak 1 November 2026'])
  })
})

describe('renderBlocks', () => {
  it('spreads list fields and shows one slot for an empty list', () => {
    expect(
      renderBlocks(
        [
          { type: 'h3', text: 'Daftar' },
          { type: 'ul', items: ['Awal', { list: 'list' }] },
          { type: 'ul', items: [{ list: 'emptyList' }] },
        ],
        context,
        placeholders,
      ),
    ).toEqual([
      { type: 'h3', parts: ['Daftar'] },
      { type: 'ul', items: [['Awal'], ['Satu'], ['Dua']] },
      { type: 'ul', items: [[{ slot: '[DAFTAR]' }]] },
    ])
  })
})
