import type { Id } from '@/types'

export const queryKeys = {
  surat: {
    all: ['surat'],
    list: (filters: unknown) => ['surat', 'list', filters],
    summary: (filters: unknown) => ['surat', 'summary', filters],
    detail: (id: Id) => ['surat', 'detail', id],
  },
  kependudukan: {
    citizens: {
      list: (filters: unknown) => ['kependudukan', 'citizens', filters],
      detail: (id: Id) => ['kependudukan', 'citizens', id],
    },
    families: {
      list: (filters: unknown) => ['kependudukan', 'families', filters],
      detail: (id: Id) => ['kependudukan', 'families', id],
    },
  },
  notifications: {
    all: ['notifications'],
    list: ['notifications', 'list'],
    unreadCount: ['notifications', 'unread-count'],
  },
  cms: {
    news: ['cms', 'news'],
    regulations: ['cms', 'regulations'],
    profile: ['cms', 'profile'],
  },
  adminConfig: {
    wilayah: ['adminConfig', 'wilayah'],
    jabatan: ['adminConfig', 'jabatan'],
    letterTypes: ['adminConfig', 'letterTypes'],
  },
}
