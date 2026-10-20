<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// UC-22: pengingat approval berbasis reminder_hours. Butuh proses
// `php artisan schedule:work` (service sid_scheduler di Docker).
Schedule::command('approvals:send-reminders')
    ->everyFiveMinutes()
    ->withoutOverlapping();

// Pengumuman beranda yang lewat waktu tayang dihapus (cache beranda ikut
// segar lewat event deleted).
Schedule::command('announcements:prune')
    ->everyMinute()
    ->withoutOverlapping();

// Retensi activity log (config activitylog.delete_records_older_than_days).
Schedule::command('activitylog:clean')->daily();
