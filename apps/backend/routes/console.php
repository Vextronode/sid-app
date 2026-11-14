<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Lewat mailer default (MAIL_MAILER), jalur yang sama dengan email reset kata sandi.
Artisan::command('mail:test {to}', function (string $to) {
    Mail::raw('Email uji dari '.config('app.name').'. Pengiriman email sudah berfungsi.', function ($message) use ($to) {
        $message->to($to)->subject('Tes pengiriman email');
    });

    $this->info('Email uji dikirim ke '.$to.' lewat mailer "'.config('mail.default').'".');
})->purpose('Kirim email uji lewat mailer default');

// UC-22: pengingat approval berbasis reminder_hours. Butuh proses
// `php artisan schedule:work` (service sid_scheduler di Docker).
Schedule::command('approvals:send-reminders')
    ->everyFiveMinutes()
    ->withoutOverlapping();

// Pengingat masa berlaku surat ke pemohon (H-30 s.d. H-1 dan hari H).
// Jam kirim di config letters.expiry_reminder.send_at; run tiap jam
// mengejar ketertinggalan bila scheduler sempat mati.
Schedule::command('letters:send-expiry-reminders')
    ->hourly()
    ->withoutOverlapping();

// Pengumuman beranda yang lewat waktu tayang dihapus (cache beranda ikut
// segar lewat event deleted).
Schedule::command('announcements:prune')
    ->everyMinute()
    ->withoutOverlapping();

// Activity log sengaja tidak dibersihkan otomatis (`activitylog:clean` tidak
// dijadwalkan): riwayat data warga/KK, jabatan, akun, dan akses identitas
// menjadi bukti bila ada sengketa bertahun-tahun kemudian. Retensi baru
// diatur bila desa punya kebijakan masa simpan arsip.
