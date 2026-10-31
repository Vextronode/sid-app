import { describe, expect, it } from 'vitest'

import { formatCoords, googleMapsUrl, parseCoords, villageCoords } from './villageMap'

describe('villageCoords', () => {
  it('returns the office point when both coordinates are set', () => {
    expect(villageCoords({ latitude: -7.6803137, longitude: 108.5513816 })).toEqual([
      -7.6803137, 108.5513816,
    ])
  })

  it.each([
    [{}],
    [null],
    [{ latitude: -7.68, longitude: null }],
    [{ latitude: '-7.68', longitude: '108.55' }],
    [{ latitude: 91, longitude: 108.55 }],
  ])('returns null for a missing or invalid location (%o)', (village) => {
    expect(villageCoords(village)).toBeNull()
  })
})

describe('googleMapsUrl', () => {
  it('searches the office by name around its coordinates, so Maps shows the place name', () => {
    expect(
      googleMapsUrl({ name: 'Desa Cibenda', latitude: -7.6803137, longitude: 108.5513816 }),
    ).toBe('https://www.google.com/maps/search/Kantor%20Desa%20Cibenda/@-7.6803137,108.5513816,17z')
  })

  it('falls back to the bare coordinates without a village name', () => {
    expect(googleMapsUrl({ latitude: -7.6803137, longitude: 108.5513816 })).toBe(
      'https://www.google.com/maps/search/?api=1&query=-7.6803137,108.5513816',
    )
  })

  it('returns null without a location', () => {
    expect(googleMapsUrl({ latitude: null, longitude: null })).toBeNull()
  })
})

describe('parseCoords', () => {
  it.each([
    ['-7.6803137, 108.5513816', [-7.6803137, 108.5513816]],
    ['-7.68,108.55', [-7.68, 108.55]],
    ['  -7.68 108.55 ', [-7.68, 108.55]],
  ])('parses "%s"', (text, expected) => {
    expect(parseCoords(text)).toEqual(expected)
  })

  it('treats an empty text as no location', () => {
    expect(parseCoords('  ')).toBeNull()
  })

  it.each(['abc', '-7.68', '95, 108', '-7.68, 200'])('rejects "%s"', (text) => {
    expect(parseCoords(text)).toBeUndefined()
  })
})

describe('formatCoords', () => {
  it('rounds to the backend precision', () => {
    expect(formatCoords([-7.680313712345, 108.5513816])).toBe('-7.6803137, 108.5513816')
  })
})
