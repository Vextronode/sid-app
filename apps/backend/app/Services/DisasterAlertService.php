<?php

namespace App\Services;

use App\Enums\DisasterAlertLevel;
use App\Jobs\SendDisasterAlertNotifications;
use App\Models\DisasterAlert;
use App\Models\IntegrationClient;
use App\Models\User;
use App\Support\IntegrationAudit;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Peringatan bencana dari SIGAP. SID tidak menyaring dan tidak mengubah isi;
 * aturan di sini hanya soal format waktu tayang, urutan pembaruan, dan kapan
 * notifikasi dikirim (docs/thirdparty/sigap/sid-sigap.md bagian 7).
 *
 * Penerimaan dari SIGAP dan aksi staf (turunkan / tampilkan lagi) memakai
 * kunci baris yang sama, jadi diproses bergantian.
 */
class DisasterAlertService
{
    public const LIST_DISPLAYED = 'displayed';

    public const LIST_DISMISSED = 'dismissed';

    /**
     * Peringatan yang tampil di halaman publik: level tertinggi lebih dulu,
     * lalu versi terbaru.
     *
     * @return Collection<int, DisasterAlert>
     */
    public function displayedForVillage(string $villageId): Collection
    {
        return DisasterAlert::query()
            ->where('village_id', $villageId)
            ->displayed()
            ->orderByDesc('level_rank')
            ->orderByDesc('sent_at')
            ->orderBy('id')
            ->get();
    }

    /**
     * Tab Peringatan SIGAP: `displayed` (urutan sama dengan beranda) atau
     * `dismissed` (diturunkan staf dan masih bisa ditampilkan lagi: belum
     * diakhiri SIGAP dan belum lewat masa tayang), terbaru diturunkan dulu.
     *
     * @return Collection<int, DisasterAlert>
     */
    public function listForStaff(string $villageId, string $status): Collection
    {
        if ($status === self::LIST_DISPLAYED) {
            return $this->displayedForVillage($villageId)->load(['integrationClient:id,name']);
        }

        return DisasterAlert::query()
            ->where('village_id', $villageId)
            ->whereNotNull('dismissed_at')
            ->whereNull('ended_at')
            ->where('expires_at', '>', now())
            ->with(['integrationClient:id,name', 'dismissedBy:id,name'])
            ->orderByDesc('dismissed_at')
            ->orderBy('id')
            ->get();
    }

    /**
     * Staf menurunkan satu peringatan yang sedang tampil (mis. alarm palsu).
     * Pembaruan dari SIGAP sesudahnya tetap disimpan tetapi tidak tampil.
     */
    public function dismiss(DisasterAlert $alert, User $actor, string $reason): DisasterAlert
    {
        return DB::transaction(function () use ($alert, $actor, $reason): DisasterAlert {
            $locked = $this->lock($alert);

            if (! $locked->isDisplayed()) {
                abort(409, 'Peringatan ini sudah tidak tampil. Muat ulang daftar.');
            }

            $locked->update([
                'dismissed_at' => now(),
                'dismissed_by' => $actor->id,
                'dismiss_reason' => $reason,
            ]);

            $this->staffAudit($locked, $actor, 'dismissed', 'Peringatan bencana diturunkan', ['reason' => $reason]);

            return $locked->load('dismissedBy:id,name');
        });
    }

    /**
     * Menampilkan lagi peringatan yang salah diturunkan, selama belum diakhiri
     * SIGAP dan belum lewat masa tayang. Tidak mengirim notifikasi ulang.
     */
    public function restore(DisasterAlert $alert, User $actor): DisasterAlert
    {
        return DB::transaction(function () use ($alert, $actor): DisasterAlert {
            $locked = $this->lock($alert);

            if ($locked->dismissed_at === null) {
                abort(409, 'Peringatan ini tidak sedang diturunkan.');
            }

            if ($locked->ended_at !== null || ! $locked->expires_at->isFuture()) {
                abort(409, 'Peringatan ini sudah berakhir atau lewat masa tayang, jadi tidak bisa ditampilkan lagi.');
            }

            $locked->update([
                'dismissed_at' => null,
                'dismissed_by' => null,
                'dismiss_reason' => null,
            ]);

            $this->staffAudit($locked, $actor, 'restored', 'Peringatan bencana ditampilkan lagi');

            return $locked;
        });
    }

    /**
     * Membuat atau memperbarui peringatan dari SIGAP (PUT /alerts/{id}).
     *
     * - Diakhiri bersifat final: pembaruan diabaikan.
     * - `sent_at` yang tidak lebih baru dari yang tersimpan diabaikan
     *   (datang terlambat atau dikirim ulang).
     * - Peringatan yang diturunkan staf tetap tersembunyi; isinya tetap
     *   diperbarui.
     *
     * @param  array<string, mixed>  $data  Hasil UpsertDisasterAlertRequest.
     * @return array{alert: DisasterAlert, created: bool}
     */
    public function upsertFromSigap(IntegrationClient $client, string $externalId, array $data): array
    {
        $sentAt = self::time($data['sent_at'])->startOfSecond();

        return DB::transaction(function () use ($client, $externalId, $data, $sentAt): array {
            $alert = DisasterAlert::query()
                ->where('integration_client_id', $client->id)
                ->where('external_id', $externalId)
                ->lockForUpdate()
                ->first();

            if ($alert === null) {
                $alert = DisasterAlert::query()->create([
                    'village_id' => $client->village_id,
                    'integration_client_id' => $client->id,
                    'external_id' => $externalId,
                    ...$this->content($data, $sentAt, now()),
                ]);

                $this->audit($client, $alert, 'alert_created', 'Peringatan bencana diterima dari SIGAP');
                $this->queueNotificationIfNeeded($alert);

                return ['alert' => $alert, 'created' => true];
            }

            if ($alert->ended_at !== null) {
                $this->audit($client, $alert, 'alert_ignored', 'Pembaruan peringatan diabaikan', ['reason' => 'ended']);

                return ['alert' => $alert, 'created' => false];
            }

            if ($sentAt->lessThanOrEqualTo($alert->sent_at)) {
                $this->audit($client, $alert, 'alert_ignored', 'Pembaruan peringatan diabaikan', ['reason' => 'stale']);

                return ['alert' => $alert, 'created' => false];
            }

            $alert->update($this->content($data, $sentAt, $alert->created_at));

            $this->audit($client, $alert, 'alert_updated', 'Peringatan bencana diperbarui SIGAP');
            $this->queueNotificationIfNeeded($alert);

            return ['alert' => $alert, 'created' => false];
        });
    }

    /**
     * Mengakhiri peringatan (POST /alerts/{id}/end). Final dan aman diulang.
     */
    public function endFromSigap(IntegrationClient $client, string $externalId): DisasterAlert
    {
        return DB::transaction(function () use ($client, $externalId): DisasterAlert {
            $alert = DisasterAlert::query()
                ->where('integration_client_id', $client->id)
                ->where('external_id', $externalId)
                ->lockForUpdate()
                ->first();

            if ($alert === null) {
                abort(404, 'Peringatan tidak ditemukan.');
            }

            if ($alert->ended_at === null) {
                $alert->update(['ended_at' => now()]);

                $this->audit($client, $alert, 'alert_ended', 'Peringatan bencana diakhiri SIGAP');
            }

            return $alert;
        });
    }

    /**
     * Menghapus peringatan yang berakhir atau kedaluwarsa lebih lama dari
     * masa simpan. Dijadwalkan harian (`disaster-alerts:prune`).
     */
    public function prune(): int
    {
        $cutoff = now()->subDays((int) config('disaster_alerts.retention_days'));

        return DisasterAlert::query()
            ->where(fn ($query) => $query
                ->where('expires_at', '<', $cutoff)
                ->orWhere('ended_at', '<', $cutoff))
            ->delete();
    }

    /**
     * Isi peringatan dari request SIGAP, dengan masa tayang yang sudah
     * memakai default (sejak versi ini diterima) dan batas maksimal (sejak
     * peringatan pertama kali diterima).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function content(array $data, CarbonInterface $sentAt, CarbonInterface $firstReceivedAt): array
    {
        $level = DisasterAlertLevel::from($data['level']);
        $latest = $firstReceivedAt->copy()->addDays((int) config('disaster_alerts.max_days'));
        $expiresAt = filled($data['expires_at'] ?? null)
            ? self::time($data['expires_at'])
            : now()->addHours((int) config('disaster_alerts.default_hours'));

        return [
            'type' => $data['type'],
            'level' => $level,
            'level_rank' => $level->rank(),
            'title' => $data['title'],
            'message' => $data['message'] ?? null,
            'magnitude' => $data['magnitude'] ?? null,
            'depth_km' => $data['depth_km'] ?? null,
            'location' => $data['location'] ?? null,
            'link_url' => $data['link_url'] ?? null,
            'occurred_at' => self::time($data['occurred_at']),
            'sent_at' => $sentAt,
            'expires_at' => $expiresAt->min($latest),
        ];
    }

    /**
     * Waktu dari SIGAP diubah ke zona waktu aplikasi sebelum disimpan:
     * Eloquent menyimpan jam apa adanya tanpa konversi, jadi "...Z" (UTC)
     * akan bergeser 7 jam bila tidak dinormalkan.
     */
    private static function time(string $value): Carbon
    {
        return Carbon::parse($value)->setTimezone(config('app.timezone'));
    }

    /**
     * Notifikasi hanya untuk peringatan yang tampil dan levelnya lebih tinggi
     * dari yang pernah dikirim. Job memeriksa ulang di bawah kunci baris,
     * jadi pembaruan yang berdekatan tidak mengirim dobel.
     */
    private function queueNotificationIfNeeded(DisasterAlert $alert): void
    {
        if ($alert->isDisplayed() && $alert->level_rank > ($alert->notified_level_rank ?? 0)) {
            SendDisasterAlertNotifications::dispatch($alert->id)->afterCommit();
        }
    }

    /** Kunci baris yang sama dengan penerimaan dari SIGAP. */
    private function lock(DisasterAlert $alert): DisasterAlert
    {
        return DisasterAlert::query()->lockForUpdate()->findOrFail($alert->getKey());
    }

    /**
     * Aksi staf di activity log `disaster_alert` (causer staf).
     *
     * @param  array<string, mixed>  $properties
     */
    private function staffAudit(DisasterAlert $alert, User $actor, string $event, string $description, array $properties = []): void
    {
        activity('disaster_alert')
            ->performedOn($alert)
            ->causedBy($actor)
            ->event($event)
            ->withProperties([
                'village_id' => $alert->village_id,
                'subject_label' => $alert->title,
                'external_id' => $alert->external_id,
                'level' => $alert->level->value,
                ...$properties,
            ])
            ->log($description);
    }

    /**
     * @param  array<string, mixed>  $properties
     */
    private function audit(IntegrationClient $client, DisasterAlert $alert, string $event, string $description, array $properties = []): void
    {
        IntegrationAudit::record($client, $event, $description, [
            'external_id' => $alert->external_id,
            'alert_id' => $alert->id,
            'level' => $alert->level->value,
            ...$properties,
        ]);
    }
}
