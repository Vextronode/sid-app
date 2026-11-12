<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Tanda tangan pihak lain pada surat
    |--------------------------------------------------------------------------
    |
    | request_ttl_days: masa berlaku permintaan tanda tangan sebelum dianggap
    | kedaluwarsa. max_rejections dan rejection_window_hours: setelah seorang
    | pemilik NIK menolak permintaan dari pemohon yang sama sebanyak itu dalam
    | rentang waktu tersebut, pemohon tidak dapat meminta tanda tangan ke NIK
    | itu sampai rentang waktunya lewat. Pengajuan surat lain tidak terpengaruh.
    |
    */

    'signature' => [
        'request_ttl_days' => (int) env('LETTER_SIGNATURE_REQUEST_TTL_DAYS', 3),
        'max_rejections' => (int) env('LETTER_SIGNATURE_MAX_REJECTIONS', 3),
        'rejection_window_hours' => (int) env('LETTER_SIGNATURE_REJECTION_WINDOW_HOURS', 24),
    ],

    /*
    |--------------------------------------------------------------------------
    | Pengingat masa berlaku surat
    |--------------------------------------------------------------------------
    |
    | send_at: jam kirim (zona waktu aplikasi) untuk setiap titik H-n dan
    | hari H. expired_notice_grace_days: bila hari H sudah lewat lebih dari
    | sekian hari (mis. scheduler lama mati), surat ditandai selesai tanpa
    | mengirim notifikasi. Titik mana yang aktif diatur Staf SIDUTama di
    | tabel letter_expiry_reminder_settings.
    |
    */

    'expiry_reminder' => [
        'send_at' => env('LETTER_EXPIRY_REMINDER_SEND_AT', '09:00'),
        'expired_notice_grace_days' => (int) env('LETTER_EXPIRY_REMINDER_GRACE_DAYS', 3),
    ],

];
