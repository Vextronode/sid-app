import api from '@/lib/api'
import type { AppNotification, LaravelPaginatedResponse, ResourceResponse } from '@/types'

// Berhalaman (20 per halaman, terbaru dulu); halaman berikutnya dimuat
// lewat tombol "Muat lebih banyak" di popover.
export function getNotifications(page = 1) {
  return api.get<LaravelPaginatedResponse<AppNotification>>('/api/notifications', {
    params: { page },
  })
}

export function getUnreadNotificationCount() {
  return api.get<ResourceResponse<{ count: number }>>('/api/notifications/unread-count')
}

export function markNotificationAsRead(id: string) {
  return api.post(`/api/notifications/${id}/read`)
}

export function markAllNotificationsAsRead() {
  return api.post('/api/notifications/read-all')
}

export function savePushSubscription(subscription: PushSubscriptionJSON) {
  return api.post('/api/push-subscriptions', subscription)
}

export function removePushSubscription(endpoint: string) {
  return api.delete('/api/push-subscriptions', { data: { endpoint } })
}
