import api from '@/lib/api'
import type { AppNotification, CollectionResponse, ResourceResponse } from '@/types'

export function getNotifications() {
  return api.get<CollectionResponse<AppNotification>>('/api/notifications')
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
