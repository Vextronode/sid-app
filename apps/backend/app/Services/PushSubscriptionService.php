<?php

namespace App\Services;

use App\Models\User;

class PushSubscriptionService
{
    /**
     * @param  array{endpoint: string, keys: array{p256dh: string, auth: string}, content_encoding?: string|null}  $data
     */
    public function subscribe(User $user, array $data): void
    {
        $user->updatePushSubscription(
            endpoint: $data['endpoint'],
            key: $data['keys']['p256dh'],
            token: $data['keys']['auth'],
            contentEncoding: $data['content_encoding'] ?? null,
        );
    }

    public function unsubscribe(User $user, string $endpoint): void
    {
        $user->deletePushSubscription($endpoint);
    }
}
