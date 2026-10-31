import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  post: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ default: api }))

import { removePushSubscription, savePushSubscription } from './api'

describe('web push subscription API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends the browser PushSubscription JSON without reshaping it', () => {
    const subscription = {
      endpoint: 'https://push.example/subscription',
      keys: { p256dh: 'public-key', auth: 'auth-token' },
    }

    savePushSubscription(subscription)

    expect(api.post).toHaveBeenCalledWith('/api/push-subscriptions', subscription)
  })

  it('removes a browser subscription by endpoint', () => {
    const endpoint = 'https://push.example/subscription'

    removePushSubscription(endpoint)

    expect(api.delete).toHaveBeenCalledWith('/api/push-subscriptions', {
      data: { endpoint },
    })
  })
})
