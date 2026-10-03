<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfileControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_change_username_with_normalization_and_keep_own_username(): void
    {
        $user = User::factory()->create(['username' => 'siti.1234']);

        $this->actingAs($user)->patchJson('/api/profile', [
            'username' => '  SITI.1234 ',
        ])->assertOk()
            ->assertJsonPath('user.username', 'siti.1234');

        $this->actingAs($user)->patchJson('/api/profile', [
            'username' => ' New.User_1 ',
        ])->assertOk()
            ->assertJsonPath('user.username', 'new.user_1');
    }

    public function test_profile_rejects_invalid_or_duplicate_usernames(): void
    {
        $user = User::factory()->create();
        User::factory()->create(['username' => 'another.user']);

        $this->actingAs($user)->patchJson('/api/profile', [
            'username' => 'bad username',
        ])->assertUnprocessable()->assertJsonValidationErrors('username');

        $this->actingAs($user)->patchJson('/api/profile', [
            'username' => 'another.user',
        ])->assertUnprocessable()->assertJsonValidationErrors('username');
    }

    public function test_user_can_change_or_clear_email_and_email_verification_is_reset(): void
    {
        $user = User::factory()->create([
            'email' => 'lama@example.test',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)->patchJson('/api/profile', [
            'email' => 'baru@example.test',
        ])->assertOk()
            ->assertJsonPath('user.email', 'baru@example.test');
        $this->assertNull($user->fresh()->email_verified_at);

        $this->actingAs($user)->patchJson('/api/profile', [
            'email' => null,
        ])->assertOk()
            ->assertJsonPath('user.email', null);
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_profile_requires_at_least_one_field_and_rejects_duplicate_email(): void
    {
        $user = User::factory()->create();
        User::factory()->create(['email' => 'used@example.test']);

        $this->actingAs($user)->patchJson('/api/profile', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('profile');

        $this->actingAs($user)->patchJson('/api/profile', [
            'email' => 'used@example.test',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_user_can_change_password_and_clear_required_password_flag(): void
    {
        $user = User::factory()->mustChangePassword()->create();

        $this->actingAs($user)->putJson('/api/profile/password', [
            'current_password' => 'Password123',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
        ])->assertOk()
            ->assertJsonPath('user.must_change_password', false);

        $user = $user->fresh();
        $this->assertTrue(Hash::check('RahasiaAman123!', $user->password));
        $this->assertFalse($user->must_change_password);
    }

    public function test_password_change_rejects_same_password_and_wrong_current_password(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->putJson('/api/profile/password', [
            'current_password' => 'Password123',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->actingAs($user)->putJson('/api/profile/password', [
            'current_password' => 'wrong-password',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
        ])->assertUnprocessable()->assertJsonValidationErrors('current_password');
    }
}
