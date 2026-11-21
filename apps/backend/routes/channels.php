<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Channel broadcast (Laravel Reverb)
|--------------------------------------------------------------------------
| Otorisasi channel private lewat POST /api/broadcasting/auth (sesi Sanctum
| SPA, middleware di bootstrap/app.php). Event hanya membawa sinyal
| { type, id }; data tetap diambil lewat endpoint REST beserta aturan
| aksesnya, jadi channel tidak pernah memuat data warga.
| Rencana: docs/task/feature/realtime-reverb.md.
*/

// Sinyal milik satu akun: notifikasi baru dan perubahan surat yang
// diajukannya. Pembanding string, tanpa query: id dari nama channel tidak
// pernah dipakai mencari data.
Broadcast::channel('App.Models.User.{id}', function (User $user, string $id): bool {
    return (string) $user->getKey() === $id;
});

// Perubahan surat untuk semua akun non-warga (RT, RW, Kadus, Kasi/Kaur,
// Kades/Sekdes, Staf). Hanya id surat; daftar yang diambil ulang tetap
// disaring LetterService::scopedQuery sesuai peran dan wilayah.
Broadcast::channel('letters.staff', function (User $user): bool {
    return $user->role !== UserRole::Warga->value;
});

// `disaster-alerts` adalah channel publik (tanpa otorisasi): bar peringatan
// tampil untuk pengunjung tanpa login. Lihat DisasterAlertsChanged.
