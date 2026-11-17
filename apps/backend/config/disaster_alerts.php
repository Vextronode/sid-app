<?php

/*
|--------------------------------------------------------------------------
| Peringatan bencana dari SIGAP
|--------------------------------------------------------------------------
| Nilai yang masih menunggu konfirmasi tim SIGAP (masa tayang dan domain
| link) dibuat mudah diganti di sini. Lihat
| docs/thirdparty/sigap/sid-sigap.md bagian 7 dan 12.
*/

return [

    // Masa tayang bila SIGAP tidak mengirim `expires_at`, sejak diterima.
    'default_hours' => (int) env('DISASTER_ALERT_DEFAULT_HOURS', 6),

    // Batas masa tayang sejak peringatan pertama kali diterima.
    'max_days' => (int) env('DISASTER_ALERT_MAX_DAYS', 3),

    // Riwayat disimpan selama ini setelah berakhir atau kedaluwarsa, lalu
    // dihapus `disaster-alerts:prune`.
    'retention_days' => 30,

    // Domain SIGAP yang boleh dipakai `link_url` (https), dipisah koma, mis.
    // "sigap.example.id". Kosong berarti semua `link_url` ditolak.
    'link_hosts' => array_values(array_filter(array_map(
        fn (string $host) => strtolower(trim($host)),
        explode(',', (string) env('SIGAP_LINK_HOSTS', '')),
    ))),

    // Jumlah akun per kelompok saat mengirim notifikasi ke semua warga.
    'notification_chunk' => 200,

];
