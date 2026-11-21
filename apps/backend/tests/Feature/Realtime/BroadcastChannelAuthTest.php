<?php

namespace Tests\Feature\Realtime;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\UsesReverbBroadcaster;
use Tests\TestCase;

/**
 * Otorisasi channel private lewat POST /api/broadcasting/auth
 * (docs/task/feature/realtime-reverb.md, bagian Channel).
 */
class BroadcastChannelAuthTest extends TestCase
{
    use RefreshDatabase;
    use UsesReverbBroadcaster;

    protected function setUp(): void
    {
        parent::setUp();

        $this->useReverbBroadcaster();
    }

    public function test_guest_cannot_authorize_any_private_channel(): void
    {
        $user = User::factory()->create();

        $this->authorizeChannel("private-App.Models.User.{$user->id}")
            ->assertUnauthorized();
    }

    public function test_user_can_authorize_own_channel(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->authorizeChannel("private-App.Models.User.{$user->id}")
            ->assertOk();

        $this->assertStringStartsWith(self::REVERB_TEST_KEY.':', (string) $response->json('auth'));
    }

    public function test_user_cannot_authorize_another_users_channel(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($user)
            ->authorizeChannel("private-App.Models.User.{$other->id}")
            ->assertForbidden();
    }

    public function test_channel_id_that_is_not_a_uuid_is_rejected_without_error(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->authorizeChannel('private-App.Models.User.bukan-uuid')
            ->assertForbidden();
    }

    public function test_unknown_channel_is_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->authorizeChannel('private-letters.semua')
            ->assertForbidden();
    }

    /**
     * @return array<string, array{string}>
     */
    public static function nonCitizenRoles(): array
    {
        $roles = array_values(array_diff(UserRole::values(), [UserRole::Warga->value]));

        return array_combine($roles, array_map(fn (string $role) => [$role], $roles));
    }

    #[DataProvider('nonCitizenRoles')]
    public function test_every_non_citizen_role_can_authorize_the_staff_letters_channel(string $role): void
    {
        $user = User::factory()->role($role)->create();

        $this->actingAs($user)
            ->authorizeChannel('private-letters.staff')
            ->assertOk();
    }

    public function test_citizen_cannot_authorize_the_staff_letters_channel(): void
    {
        $user = User::factory()->role(UserRole::Warga->value)->create();

        $this->actingAs($user)
            ->authorizeChannel('private-letters.staff')
            ->assertForbidden();
    }

    public function test_inactive_account_is_rejected(): void
    {
        $user = User::factory()->inactive()->create();

        $this->actingAs($user)
            ->authorizeChannel("private-App.Models.User.{$user->id}")
            ->assertForbidden()
            ->assertJsonPath('code', 'account_inactive');
    }

    public function test_account_that_must_change_password_is_rejected(): void
    {
        $user = User::factory()->mustChangePassword()->create();

        $this->actingAs($user)
            ->authorizeChannel("private-App.Models.User.{$user->id}")
            ->assertForbidden()
            ->assertJsonPath('code', 'password_change_required');
    }
}
