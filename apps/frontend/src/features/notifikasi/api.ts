import api from '@/lib/api'

export function getNotifications() {
  return api.get('/api/notifications')
}

export function getUnreadNotificationCount() {
  return api.get('/api/notifications/unread-count')
}

export function markNotificationAsRead(id) {
  return api.post(`/api/notifications/${id}/read`)
}

export function markAllNotificationsAsRead() {
  return api.post('/api/notifications/read-all')
}

export function savePushSubscription(subscription) {
  return api.post('/api/push-subscriptions', subscription)
}

export function removePushSubscription(endpoint) {
  return api.delete('/api/push-subscriptions', { data: { endpoint } })
}