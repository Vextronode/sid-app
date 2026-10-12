import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../api'
import useNotifications from './useNotifications'

vi.mock('../api', () => ({
  getNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  markNotificationAsRead: vi.fn(),
}))

const notifications = [
  { id: 'notification-1', title: 'Surat diproses', read: false },
  { id: 'notification-2', title: 'Surat selesai', read: true },
]

function renderNotifications() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }) => createElement(QueryClientProvider, { client }, children)

  return renderHook(() => useNotifications(), { wrapper })
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getNotifications.mockResolvedValue({ data: { data: notifications } })
    getUnreadNotificationCount.mockResolvedValue({ data: { count: 1 } })
    markNotificationAsRead.mockResolvedValue({ data: { message: 'ok' } })
    markAllNotificationsAsRead.mockResolvedValue({ data: { message: 'ok' } })
  })

  it('loads notifications and unread count from BE response shapes', async () => {
    const { result } = renderNotifications()

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(getNotifications).toHaveBeenCalledOnce()
    expect(getUnreadNotificationCount).toHaveBeenCalledOnce()
    expect(result.current.notifications).toEqual(notifications)
    expect(result.current.unreadCount).toBe(1)
  })

  it('updates a notification locally only after mark-read succeeds', async () => {
    const { result } = renderNotifications()
    await waitFor(() => expect(result.current.loading).toBe(false))
    getUnreadNotificationCount.mockResolvedValueOnce({ data: { count: 0 } })

    await act(async () => {
      await result.current.markAsRead('notification-1')
    })

    expect(markNotificationAsRead).toHaveBeenCalledWith('notification-1')
    expect(result.current.notifications[0].read).toBe(true)
    expect(getUnreadNotificationCount).toHaveBeenCalledTimes(2)
    expect(result.current.unreadCount).toBe(0)
  })

  it('reuses cached data when another layout mounts the hook', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }) => createElement(QueryClientProvider, { client }, children)

    const first = renderHook(() => useNotifications(), { wrapper })
    await waitFor(() => expect(first.result.current.loading).toBe(false))
    first.unmount()

    const second = renderHook(() => useNotifications(), { wrapper })

    expect(second.result.current.loading).toBe(false)
    expect(second.result.current.notifications).toEqual(notifications)
    expect(getNotifications).toHaveBeenCalledOnce()
    expect(getUnreadNotificationCount).toHaveBeenCalledOnce()
  })

  it('does not update notification state when mark-read fails', async () => {
    markNotificationAsRead.mockRejectedValueOnce(new Error('request failed'))
    const { result } = renderNotifications()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.markAsRead('notification-1')
    })

    expect(result.current.notifications[0].read).toBe(false)
    expect(result.current.error).toBe('Gagal menandai notifikasi sebagai dibaca.')
  })

  it('marks all local notifications as read after BE succeeds', async () => {
    const { result } = renderNotifications()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.markAllAsRead()
    })

    expect(markAllNotificationsAsRead).toHaveBeenCalledOnce()
    expect(result.current.notifications.every((item) => item.read)).toBe(true)
  })
})
