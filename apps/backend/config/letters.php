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
        'request_ttl_days' => (int) env('LETTER_SIGNATURE_REQUEST_TTL_DAYS', 7),
        'max_rejections' => (int) env('LETTER_SIGNATURE_MAX_REJECTIONS', 3),
        'rejection_window_hours' => (int) env('LETTER_SIGNATURE_REJECTION_WINDOW_HOURS', 24),
    ],

];
