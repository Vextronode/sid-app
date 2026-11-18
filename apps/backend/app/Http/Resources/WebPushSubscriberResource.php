<?php

namespace App\Http\Resources;

use App\Enums\UserRole;
use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/**
 * Satu akun di menu Pelanggan Notifikasi. endpoint, public_key, dan
 * auth_token TIDAK pernah dikirim: siapa pun yang memegangnya bisa
 * mengirim push ke perangkat tersebut.
 *
 * @mixin User
 */
class WebPushSubscriberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Collection<int, PushSubscription> $devices */
        $devices = $this->pushSubscriptions;
        $citizen = $this->citizen;
        $nik = $citizen?->nik;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'username' => $this->username,
            'role' => $this->role,
            'role_label' => UserRole::tryFrom((string) $this->role)?->label() ?? $this->role,
            'is_active' => (bool) $this->is_active,
            'nik_masked' => $nik ? str_repeat('*', 12).substr($nik, -4) : null,
            'wilayah' => $citizen ? [
                'hamlet' => $citizen->rw?->hamlet?->name,
                'rw' => $citizen->rw?->number,
                'rt' => $citizen->rt?->number,
            ] : null,
            'device_count' => (int) ($this->push_subscriptions_count ?? $devices->count()),
            'status' => $this->accountStatus($devices),
            'first_subscribed_at' => $devices->min('created_at')?->toIso8601String(),
            'last_success_at' => $devices->max('last_success_at')?->toIso8601String(),
            'devices' => $devices->map(fn (PushSubscription $device) => [
                'id' => $device->id,
                'device_label' => $device->device_label,
                'push_service' => $device->pushService(),
                'status' => $device->status(),
                'subscribed_at' => $device->created_at?->toIso8601String(),
                'updated_at' => $device->updated_at?->toIso8601String(),
                'last_success_at' => $device->last_success_at?->toIso8601String(),
                'last_failed_at' => $device->last_failed_at?->toIso8601String(),
            ])->values(),
        ];
    }

    /**
     * Status akun = status terbaik di antara perangkatnya: aktif bila ada
     * satu perangkat aktif; perlu dicek bila ada yang pernah dicoba; selain
     * itu belum teruji.
     *
     * @param  Collection<int, PushSubscription>  $devices
     */
    private function accountStatus($devices): string
    {
        $statuses = $devices->map(fn (PushSubscription $device) => $device->status());

        foreach ([PushSubscription::STATUS_ACTIVE, PushSubscription::STATUS_NEEDS_CHECK] as $status) {
            if ($statuses->contains($status)) {
                return $status;
            }
        }

        return PushSubscription::STATUS_UNTESTED;
    }
}
