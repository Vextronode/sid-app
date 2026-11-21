// Saat WebSocket tersambung, data diperbarui lewat event. Polling tetap
// berjalan sesekali sebagai jaring pengaman (event yang terlewat).
export const REALTIME_SAFETY_INTERVAL = 5 * 60 * 1000

// Nama event dari backend (broadcastAs). Titik di depan: nama apa adanya,
// tanpa awalan namespace App.Events milik Echo.
export const REALTIME_EVENTS = {
  notificationCreated: '.notification.created',
  letterChanged: '.letter.changed',
  disasterAlertsChanged: '.disaster-alerts.changed',
} as const

export const realtimeChannels = {
  // private: notifikasi dan surat milik akun itu.
  user: (userId: string) => `App.Models.User.${userId}`,
  // private: perubahan surat untuk semua akun non-warga.
  lettersStaff: 'letters.staff',
  // publik: peringatan bencana, juga untuk pengunjung tanpa login.
  disasterAlerts: 'disaster-alerts',
}

// Satu aksi bisa menyimpan surat beberapa kali (mis. status lalu nomor
// surat); sinyal yang berdekatan digabung menjadi satu pengambilan ulang.
export const LETTER_SIGNAL_DEBOUNCE_MS = 300

// Bar peringatan publik bisa terbuka di banyak perangkat sekaligus saat
// bencana; pengambilan ulangnya disebar acak dalam rentang ini supaya
// server tidak menerima semuanya di detik yang sama.
export const PUBLIC_ALERT_REFRESH_JITTER_MS = 3000

// Pasang di `meta` query yang diperbarui lewat realtime: query ini diambil
// ulang saat WebSocket tersambung kembali (event selama terputus hilang).
export const REALTIME_QUERY_META = { realtime: true } as const
