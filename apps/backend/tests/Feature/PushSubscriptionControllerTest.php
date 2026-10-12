<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PushSubscriptionControllerTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123',
            'keys' => [
                'p256dh' => 'public-key-value',
                'auth' => 'auth-token-value',
            ],
        ], $overrides);
    }

    public function test_store_creates_a_push_subscription_for_the_authenticated_user(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/push-subscriptions', $this->payload())
            ->assertCreated()
            ->assertJsonPath('message', 'Langganan push notification berhasil disimpan.');

        $this->assertDatabaseHas('push_subscriptions', [
            'subscribable_id' => $user->id,
            'subscribable_type' => User::class,
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123',
            'public_key' => 'public-key-value',
            'auth_token' => 'auth-token-value',
        ]);
    }

    public function test_store_updates_the_existing_subscription_when_endpoint_already_registered_by_the_same_user(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/push-subscriptions', $this->payload())->assertCreated();

        $this->actingAs($user)
            ->postJson('/api/push-subscriptions', $this->payload([
                'keys' => ['p256dh' => 'new-public-key', 'auth' => 'new-auth-token'],
            ]))
            ->assertCreated();

        $this->assertSame(1, $user->pushSubscriptions()->count());
        $this->assertDatabaseHas('push_subscriptions', [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123',
            'public_key' => 'new-public-key',
        ]);
    }

    public function test_store_requires_endpoint_and_keys(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/push-subscriptions', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['endpoint', 'keys.p256dh', 'keys.auth']);
    }

    public function test_store_requires_authentication(): void
    {
        $this->postJson('/api/push-subscriptions', $this->payload())
            ->assertUnauthorized();
    }

    public function test_destroy_removes_the_subscription_for_the_authenticated_user(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/api/push-subscriptions', $this->payload())->assertCreated();

        $this->actingAs($user)
            ->deleteJson('/api/push-subscriptions', ['endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123'])
            ->assertOk()
            ->assertJsonPath('message', 'Langganan push notification berhasil dihapus.');

        $this->assertDatabaseMissing('push_subscriptions', [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123',
        ]);
    }

    public function test_destroy_does_not_remove_another_users_subscription(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $this->actingAs($owner)->postJson('/api/push-subscriptions', $this->payload())->assertCreated();

        $this->actingAs($stranger)
            ->deleteJson('/api/push-subscriptions', ['endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123'])
            ->assertOk();

        $this->assertDatabaseHas('push_subscriptions', [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123',
            'subscribable_id' => $owner->id,
        ]);
    }

    public function test_destroy_requires_authentication(): void
    {
        $this->deleteJson('/api/push-subscriptions', ['endpoint' => 'https://fcm.googleapis.com/fcm/send/abc123'])
            ->assertUnauthorized();
    }
}
