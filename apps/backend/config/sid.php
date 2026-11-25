<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Nama aplikasi desa
    |--------------------------------------------------------------------------
    | Nama produk yang tampil ke pengguna, termasuk label peran staf yang
    | memegang aplikasi ("Staf {nama}", kode peran: staf_sid). Bisa diganti
    | lewat env tanpa mengubah kode bila desa memakai nama lain. Terpisah
    | dari APP_NAME, yang bawaannya "Laravel" dan dipakai untuk mail.
    */

    'app_name' => env('SID_APP_NAME', 'SIDUTama'),

    /*
    |--------------------------------------------------------------------------
    | Realtime (Laravel Reverb) untuk browser
    |--------------------------------------------------------------------------
    | Alamat WebSocket yang dipakai browser, dikirim lewat
    | GET /api/realtime/config. Berbeda dari REVERB_HOST/PORT/SCHEME, yang
    | dipakai backend untuk mengirim event ke server Reverb (di Docker:
    | sid_reverb:8080). Kosong = ikut origin halaman, yaitu stack Docker
    | tempat Nginx sid_web meneruskan /app/ ke sid_reverb.
    |
    | Realtime aktif bila BROADCAST_CONNECTION=reverb dan REVERB_APP_KEY
    | terisi; selain itu frontend tetap polling seperti biasa.
    */

    'realtime' => [
        'client_host' => env('REVERB_CLIENT_HOST') ?: null,
        'client_port' => env('REVERB_CLIENT_PORT') ?: null,
        'client_scheme' => env('REVERB_CLIENT_SCHEME') ?: null,
    ],

    /*
    |--------------------------------------------------------------------------
    | Masa simpan notifikasi
    |--------------------------------------------------------------------------
    | Notifikasi yang sudah dibaca lebih dari sekian hari dihapus harian oleh
    | `notifications:prune`. Notifikasi yang belum dibaca tidak dihapus.
    */

    'notifications' => [
        'read_retention_days' => (int) env('NOTIFICATIONS_READ_RETENTION_DAYS', 90),
    ],

];
