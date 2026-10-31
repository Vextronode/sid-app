import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ default: api }))

import {
  createOfficialPositionType,
  createPerangkatDesa,
  deleteOfficialPositionType,
  deletePerangkatDesa,
  demotePerangkatDesa,
  findOfficialCandidate,
  getOfficialPositionTypes,
  getPerangkatDesa,
  promotePerangkatDesa,
  rotatePerangkatDesa,
  updateOfficialPositionType,
  updatePerangkatDesa,
  uploadOfficialPhoto,
} from './api'
import { partialFixture } from '@/test/fixtures'
import type { OfficialAssignPayload } from './types'

describe('official API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the current officials and lifecycle endpoints', () => {
    const payload = partialFixture<OfficialAssignPayload>({
      user_id: 'user-id',
      position: 'rt',
      started_at: '2026-10-01',
    })

    getPerangkatDesa()
    createPerangkatDesa({ citizen_id: 'citizen-id', position: 'kepala_desa' })
    updatePerangkatDesa(5, { phone_wa: '081234567890' })
    deletePerangkatDesa(5)
    promotePerangkatDesa(payload)
    demotePerangkatDesa(5)
    rotatePerangkatDesa(5, payload)

    expect(api.get).toHaveBeenCalledWith('/api/officials')
    expect(api.post).toHaveBeenNthCalledWith(1, '/api/officials', {
      citizen_id: 'citizen-id',
      position: 'kepala_desa',
    })
    expect(api.patch).toHaveBeenCalledWith('/api/officials/5', {
      phone_wa: '081234567890',
    })
    expect(api.delete).toHaveBeenCalledWith('/api/officials/5')
    expect(api.post).toHaveBeenNthCalledWith(3, '/api/officials/5/demote', {})

    // Penetapan dan rotasi dikirim multipart karena membawa foto.
    const [promoteUrl, promoteBody, promoteConfig] = api.post.mock.calls[1]
    const [rotateUrl, rotateBody] = api.post.mock.calls[3]

    expect(promoteUrl).toBe('/api/officials/promote')
    expect(promoteBody).toBeInstanceOf(FormData)
    expect(Object.fromEntries(promoteBody)).toEqual(payload)
    expect(promoteConfig.headers['Content-Type']).toBe('multipart/form-data')
    expect(rotateUrl).toBe('/api/officials/5/rotate')
    expect(Object.fromEntries(rotateBody)).toEqual(payload)
  })

  it('manages position types without accounts through their own endpoints', () => {
    getOfficialPositionTypes()
    createOfficialPositionType({ label: 'Kasi Trantib' })
    updateOfficialPositionType(3, { is_active: false })
    deleteOfficialPositionType(3)

    expect(api.get).toHaveBeenCalledWith('/api/official-position-types')
    expect(api.post).toHaveBeenCalledWith('/api/official-position-types', { label: 'Kasi Trantib' })
    expect(api.patch).toHaveBeenCalledWith('/api/official-position-types/3', { is_active: false })
    expect(api.delete).toHaveBeenCalledWith('/api/official-position-types/3')
  })

  it('sends the photo with assignments and skips empty optional fields', () => {
    const photo = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' })

    promotePerangkatDesa(
      partialFixture<OfficialAssignPayload>({
        citizen_id: 'citizen-id',
        position: 'kaur_keuangan',
        notes: '',
        photo,
      }),
    )
    uploadOfficialPhoto(7, photo)
    findOfficialCandidate('3207010101900001', 'kaur_keuangan')
    findOfficialCandidate('3207010101900001')

    const promoteBody = api.post.mock.calls[0][1]

    expect(promoteBody.get('photo')).toBeInstanceOf(File)
    expect(promoteBody.has('notes')).toBe(false)
    expect(api.post.mock.calls[1][0]).toBe('/api/officials/7/photo')
    expect(api.post.mock.calls[1][1].get('photo')).toBeInstanceOf(File)
    expect(api.post).toHaveBeenNthCalledWith(3, '/api/officials/candidates/lookup', {
      nik: '3207010101900001',
      position: 'kaur_keuangan',
    })
    expect(api.post).toHaveBeenNthCalledWith(4, '/api/officials/candidates/lookup', {
      nik: '3207010101900001',
    })
  })
})
