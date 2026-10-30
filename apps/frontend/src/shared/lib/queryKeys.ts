export const queryKeys = {
  surat: {
    all: ['surat'],
    list: (filters) => ['surat', 'list', filters],
    summary: (filters) => ['surat', 'summary', filters],
    detail: (id) => ['surat', 'detail', id],
  },
  kependudukan: {
    citizens: {
      list: (filters) => ['kependudukan', 'citizens', filters],
      detail: (id) => ['kependudukan', 'citizens', id],
    },
    families: {
      list: (filters) => ['kependudukan', 'families', filters],
      detail: (id) => ['kependudukan', 'families', id],
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
