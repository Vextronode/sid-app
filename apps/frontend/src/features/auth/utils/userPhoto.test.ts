import { describe, expect, it } from 'vitest'

import { partialFixture } from '@/test/fixtures'
import type { User } from '@/types'

import { userPhotoUrl } from './userPhoto'

describe('userPhotoUrl', () => {
  it('uses the account photo for warga', () => {
    expect(userPhotoUrl(partialFixture<User>({ role: 'warga', photo_url: '/w.jpg' }))).toBe(
      '/w.jpg',
    )
  })

  it('uses the official photo for an account holding a position, not the account photo', () => {
    const rt = partialFixture<User>({
      role: 'rt',
      photo_url: '/lama.jpg',
      official: { photo_img: '/jabatan.jpg' },
    })

    expect(userPhotoUrl(rt)).toBe('/jabatan.jpg')
    expect(userPhotoUrl(partialFixture<User>({ ...rt, official: { photo_img: null } }))).toBeNull()
  })

  it('returns null without a photo or user (default avatar)', () => {
    expect(userPhotoUrl(partialFixture<User>({ role: 'warga', photo_url: null }))).toBeNull()
    expect(userPhotoUrl(null)).toBeNull()
  })
})
