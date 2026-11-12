<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Models\Letter;
use App\Notifications\LetterStatusNotification;
use App\Repositories\LetterExpiryReminderSettingRepository;
use App\Repositories\LetterRepository;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Pengingat masa berlaku surat untuk pemohon: titik H-30/H-14/H-7/H-3/H-1
 * yang diaktifkan Staf SIDUTama, dan hari H yang selalu dikirim. Hari H
 * adalah sehari setelah tanggal `expires_at`; setiap titik H-n jatuh tempo
 * pada (H - n hari) pukul `letters.expiry_reminder.send_at`.
 *
 * Satu run mengirim paling banyak satu notifikasi per surat, dari titik
 * sah yang paling dekat ke hari H; titik yang lebih jauh dianggap selesai.
 * Dijalankan scheduler tiap jam lewat `letters:send-expiry-reminders`.
 */
class LetterExpiryReminderService
{
    /** Titik hari H (`expiry_notified_days` = 0). */
    private const EXPIRED_POINT = 0;

    /** Batas atas jarak hari H dari sekarang yang perlu diperiksa. */
    private const LOOKAHEAD_DAYS = 31;

    public function __construct(
        private readonly LetterRepository $letterRepository,
        private readonly LetterExpiryReminderSettingRepository $settingRepository,
    ) {}

    /**
     * @return int jumlah notifikasi yang dikirim
     */
    public function sendDueReminders(): int
    {
        /** @var array<string, array<int, Carbon|null>> $pointsByVillage */
        $pointsByVillage = [];
        $sent = 0;
        $now = now();

        foreach ($this->letterRepository->lazyExpiringForReminder($now->copy()->addDays(self::LOOKAHEAD_DAYS)) as $letter) {
            $pointsByVillage[$letter->village_id] ??= $this->settingRepository->activePointsForVillage($letter->village_id);

            $point = $this->resolvePoint($letter, $pointsByVillage[$letter->village_id], $now);

            if ($point === null) {
                continue;
            }

            if ($this->claimAndNotify($letter, $point['days'], $point['notify'])) {
                $sent++;
            }
        }

        return $sent;
    }

    /**
     * @param  array<int, Carbon|null>  $activePoints  days_before => activated_at
     * @return array{days: int, notify: bool}|null
     */
    private function resolvePoint(Letter $letter, array $activePoints, Carbon $now): ?array
    {
        $expiredDueAt = $this->dueAt($letter, self::EXPIRED_POINT);

        // Hari H yang sudah lama lewat (scheduler mati lama atau data
        // lama): ditandai selesai tanpa mengirim apa pun.
        if ($now->greaterThan($expiredDueAt->copy()->addDays(config('letters.expiry_reminder.expired_notice_grace_days')))) {
            return ['days' => self::EXPIRED_POINT, 'notify' => false];
        }

        if ($now->greaterThanOrEqualTo($expiredDueAt)) {
            return ['days' => self::EXPIRED_POINT, 'notify' => true];
        }

        // Surat sudah terkunci tapi pemberitahuan hari H belum jatuh
        // tempo: jangan kirim "akan kedaluwarsa".
        if ($letter->isExpired()) {
            return null;
        }

        $notified = $letter->expiry_notified_days;
        ksort($activePoints);

        foreach ($activePoints as $days => $activatedAt) {
            if ($notified !== null && $days >= $notified) {
                continue;
            }

            $dueAt = $this->dueAt($letter, $days);

            if ($now->lessThan($dueAt)
                || ($letter->processed_at !== null && ! $dueAt->greaterThan($letter->processed_at))
                || ($activatedAt !== null && ! $dueAt->greaterThan($activatedAt))) {
                continue;
            }

            return ['days' => $days, 'notify' => true];
        }

        return null;
    }

    /** Jatuh tempo titik H-n: tanggal (hari H - n) pukul jam kirim. */
    private function dueAt(Letter $letter, int $daysBefore): Carbon
    {
        [$hour, $minute] = array_map('intval', explode(':', config('letters.expiry_reminder.send_at')));

        return $this->expiryDay($letter)->subDays($daysBefore)->setTime($hour, $minute);
    }

    /** Hari H: hari pertama surat tidak bisa diunduh, pukul 00:00. */
    private function expiryDay(Letter $letter): Carbon
    {
        return $letter->expires_at->copy()
            ->setTimezone(config('app.timezone'))
            ->startOfDay()
            ->addDay();
    }

    /**
     * Klaim titik dengan row lock agar run yang bertabrakan tidak mengirim
     * dua kali. Notifikasi dikirim setelah commit (afterCommit).
     */
    private function claimAndNotify(Letter $candidate, int $daysBefore, bool $notify): bool
    {
        return DB::transaction(function () use ($candidate, $daysBefore, $notify): bool {
            $letter = $this->letterRepository->findForUpdateOrFail($candidate->id);

            if ($letter->status !== LetterStatus::Approved
                || $letter->expires_at === null
                || ! $letter->expires_at->equalTo($candidate->expires_at)
                || ($letter->expiry_notified_days !== null && $letter->expiry_notified_days <= $daysBefore)) {
                return false;
            }

            $this->letterRepository->markExpiryNotified($letter, $daysBefore);

            if (! $notify) {
                return false;
            }

            $letter->setRelation('letterType', $candidate->letterType);
            $candidate->user->notify($this->buildNotification($letter, $daysBefore));

            return true;
        });
    }

    private function buildNotification(Letter $letter, int $daysBefore): LetterStatusNotification
    {
        $typeName = $letter->letterType?->name ?? 'Surat';
        $lastValidDate = $letter->expires_at->copy()
            ->setTimezone(config('app.timezone'))
            ->translatedFormat('j F Y');
        $daysLeft = max(0, (int) now()->startOfDay()->diffInDays($this->expiryDay($letter), false));
        $context = ['reminder_days' => $daysBefore, 'days_left' => $daysLeft];

        if ($daysBefore === self::EXPIRED_POINT) {
            return new LetterStatusNotification(
                $letter,
                'Surat Sudah Kedaluwarsa',
                "Masa berlaku {$typeName} Anda habis pada {$lastValidDate}. Surat tidak dapat diunduh lagi.",
                'letter_expired',
                $context,
            );
        }

        $message = $daysLeft <= 1
            ? "Hari ini hari terakhir masa berlaku {$typeName} Anda (sampai {$lastValidDate})."
            : "{$typeName} Anda akan kedaluwarsa dalam {$daysLeft} hari (berlaku sampai {$lastValidDate}). "
                .'Unduh sebelum masa berlakunya habis, atau ajukan surat baru bila masih diperlukan.';

        return new LetterStatusNotification(
            $letter,
            'Surat Akan Kedaluwarsa',
            $message,
            'letter_expiring_soon',
            $context,
        );
    }
}
