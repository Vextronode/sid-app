<?php

namespace App\Services;

use App\Models\User;
use App\Support\DeviceLabel;

class PushSubscriptionService
{
    /**
     * @param  array{endpoint: string, keys: array{p256dh: string, auth: string}, content_encoding?: string|null}  $data
     * @param  string|null  $userAgent  header User-Agent request; hanya diringkas menjadi device_label.
     */
    public function subscribe(User $user, array $data, ?string $userAgent = null): void
    {
        $subscription = $user->updatePushSubscription(
            endpoint: $data['endpoint'],
            key: $data['keys']['p256dh'],
            token: $data['keys']['auth'],
            contentEncoding: $data['content_encoding'] ?? null,
        );

        // updatePushSubscription() package hanya mengisi kolom bawaannya.
        $label = DeviceLabel::fromUserAgent($userAgent);

        if ($label !== null && $subscription->getAttribute('device_label') !== $label) {
            $subscription->forceFill(['device_label' => $label])->save();
        }
    }

    public function unsubscribe(User $user, string $endpoint): void
    {
        $user->deletePushSubscription($endpoint);
    }
}
