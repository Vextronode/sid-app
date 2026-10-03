<?php

namespace Tests\Feature\Console;

use App\Models\Official;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PetugasCommandsTest extends TestCase
{
    use RefreshDatabase;

    public function test_petugas_first_bootstraps_user_official_and_audit_without_causer(): void
    {
        $village = Village::factory()->create();

        $this->artisan('petugas:first', [
            '--nik' => '3201012345671001',
            '--name' => 'Petugas Pertama',
            '--dob' => '1980-01-01',
            '--gender' => 'L',
            '--address' => 'Jalan Desa',
            '--username' => 'petugas.pertama',
            '--village' => $village->id,
            '--password' => 'Rahasia12345',
        ])->assertExitCode(0);

        $user = User::query()->where('username', 'petugas.pertama')->firstOrFail();
        $this->assertSame('petugas_desa', $user->role);
        $this->assertTrue(Hash::check('Rahasia12345', $user->password));
        $official = Official::query()->where('user_id', $user->id)->firstOrFail();
        $this->assertSame('petugas_desa', $official->position);
        $this->assertTrue($official->is_active);
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'official',
            'description' => 'promoted',
            'subject_id' => (string) $official->id,
            'causer_id' => null,
        ]);
    }

    public function test_petugas_first_rejects_when_an_active_petugas_already_exists(): void
    {
        User::factory()->create(['role' => 'petugas_desa']);

        $this->artisan('petugas:first', [
            '--nik' => '3201012345671002',
            '--name' => 'Petugas Kedua',
            '--dob' => '1980-01-01',
            '--gender' => 'L',
            '--address' => 'Jalan Desa',
            '--village' => Village::factory()->create()->id,
            '--password' => 'Rahasia12345',
        ])->assertExitCode(1);
    }

    public function test_petugas_demote_requires_force_for_the_last_petugas(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        Official::factory()->forUser($user)->position('petugas_desa')->create();

        $this->artisan('petugas:demote', ['username' => $user->username])
            ->assertExitCode(1);
        $this->assertTrue($user->fresh()->is_active);

        $this->artisan('petugas:demote', [
            'username' => $user->username,
            '--force' => true,
        ])->assertExitCode(0);

        $this->assertSame('warga', $user->fresh()->role);
        $this->assertFalse($user->officials()->where('is_active', true)->exists());
    }

    public function test_petugas_reset_password_shows_temporary_password_once_and_requires_change(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $this->artisan('petugas:reset-password', ['username' => $user->username])
            ->assertExitCode(0)
            ->expectsOutputToContain("Kata sandi sementara untuk {$user->username}:");

        $this->assertTrue($user->fresh()->must_change_password);
    }
}
