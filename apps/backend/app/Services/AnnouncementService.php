<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Announcement;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Pengumuman beranda (satu per desa), dikelola Petugas Desa. Setiap
 * pengumuman wajib punya durasi tayang; setelah lewat, ia tidak lagi tampil
 * dan dihapus oleh announcements:prune.
 */
class AnnouncementService
{
    public const UNITS = ['hour' => 'addHours', 'day' => 'addDays', 'week' => 'addWeeks'];

    // Batas atas durasi: satu tahun.
    private const MAX_DAYS = 366;

    public function current(User $user): ?Announcement
    {
        return Announcement::query()->active()->where('village_id', $this->villageId($user))->first();
    }

    public function activeForVillage(string $villageId): ?Announcement
    {
        return Announcement::query()->active()->where('village_id', $villageId)->first();
    }

    /**
     * Menyimpan pengumuman desa, menggantikan yang lama. Tanpa durasi,
     * waktu berakhir pengumuman yang masih tayang dipertahankan.
     *
     * @param  array{title: string, body?: ?string, link_url?: ?string, duration_value?: ?int, duration_unit?: ?string}  $data
     */
    public function save(User $user, array $data): Announcement
    {
        $villageId = $this->villageId($user);
        $current = $this->activeForVillage($villageId);

        $expiresAt = isset($data['duration_value'], $data['duration_unit'])
            ? $this->expiryFrom((int) $data['duration_value'], $data['duration_unit'])
            : $current?->expires_at;

        if ($expiresAt === null) {
            throw ValidationException::withMessages([
                'duration_value' => 'Tentukan berapa lama pengumuman tampil.',
            ]);
        }

        return Announcement::query()->updateOrCreate(
            ['village_id' => $villageId],
            [
                'title' => $data['title'],
                'body' => $data['body'] ?? null,
                'link_url' => $data['link_url'] ?? null,
                'expires_at' => $expiresAt,
                'created_by' => $user->id,
            ],
        );
    }

    public function delete(User $user): void
    {
        Announcement::query()->where('village_id', $this->villageId($user))->first()?->delete();
    }

    /**
     * Menghapus pengumuman yang sudah lewat waktunya. Dihapus per model agar
     * event deleted ikut menyegarkan cache beranda.
     */
    public function pruneExpired(): int
    {
        $expired = Announcement::query()->where('expires_at', '<=', now())->get();
        $expired->each->delete();

        return $expired->count();
    }

    private function expiryFrom(int $value, string $unit): Carbon
    {
        $expiresAt = now()->{self::UNITS[$unit]}($value);

        if ($expiresAt->greaterThan(now()->addDays(self::MAX_DAYS))) {
            throw ValidationException::withMessages([
                'duration_value' => 'Durasi tayang paling lama satu tahun.',
            ]);
        }

        return $expiresAt;
    }

    private function villageId(User $user): string
    {
        if ($user->role !== 'staf_sid' || ! $user->is_active || ! $user->village_id) {
            abort(403, UserRole::stafSidLabel().' aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
