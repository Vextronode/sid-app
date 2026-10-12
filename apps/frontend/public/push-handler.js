self.addEventListener('push', (event) => {
  let payload

  try {
    payload = event.data?.json() ?? {}
  } catch {
    payload = { body: event.data?.text() ?? '' }
  }

  const title = payload.title ?? 'SIDUTama'
  const options = {
    body: payload.body ?? payload.message ?? 'Ada pembaruan layanan desa.',
    icon: payload.icon ?? '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-192.png',
    tag: payload.tag ?? payload.data?.tag,
    data: payload.data ?? {},
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const requestedUrl = event.notification.data?.url ?? '/'
  const targetUrl = new URL(requestedUrl, self.location.origin)
  const safeUrl = targetUrl.origin === self.location.origin ? targetUrl.href : self.location.origin

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => new URL(client.url).origin === self.location.origin)

      if (existingClient) {
        return existingClient.navigate(safeUrl).then(() => existingClient.focus())
      }

      return self.clients.openWindow(safeUrl)
    }),
  )
})
