<?php

namespace Tests\Unit;

use App\Models\User;
use App\Repositories\UserRepository;
use App\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class UserServiceTest extends TestCase
{
    use RefreshDatabase;

    private UserService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new UserService(new UserRepository);
    }

    public function test_get_all_with_citizen_and_official_returns_users(): void
    {
        User::factory()->count(2)->create();

        $this->assertCount(2, $this->service->getAllWithCitizenAndOfficial());
    }

    public function test_toggle_active_flips_status_for_another_user(): void
    {
        $actor = User::factory()->create(['role' => 'rt']);
        $target = User::factory()->create(['is_active' => true]);

        $this->assertFalse($this->service->toggleActive($target, $actor)->is_active);
    }

    public function test_toggle_active_rejects_self_deactivation(): void
    {
        $actor = User::factory()->create(['role' => 'rt']);

        $this->expectException(HttpException::class);

        $this->service->toggleActive($actor, $actor);
    }

    public function test_update_rejects_self_deactivation_and_last_petugas_deactivation(): void
    {
        $actor = User::factory()->create(['role' => 'rt']);
        try {
            $this->service->update($actor, ['is_active' => false], $actor);
            $this->fail('Self-deactivation should be rejected.');
        } catch (HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
        }

        $lastPetugas = User::factory()->create(['role' => 'petugas_desa']);

        try {
            $this->service->update($lastPetugas, ['is_active' => false], $actor);
            $this->fail('The last active Petugas Desa should be protected.');
        } catch (HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
        }
    }

    public function test_update_accepts_name_and_status_changes_when_guards_pass(): void
    {
        $actor = User::factory()->create(['role' => 'petugas_desa']);
        $target = User::factory()->create(['name' => 'Lama']);

        $updated = $this->service->update($target, ['name' => 'Baru'], $actor);

        $this->assertSame('Baru', $updated->name);
        $this->assertTrue($updated->is_active);
    }

    public function test_petugas_can_reset_password_for_non_petugas_but_not_self_or_another_petugas(): void
    {
        $actor = User::factory()->create(['role' => 'petugas_desa']);
        $target = User::factory()->create(['role' => 'warga']);

        $temporaryPassword = $this->service->resetPassword($target, $actor);

        $this->assertSame(12, strlen($temporaryPassword));
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9]{12}$/', $temporaryPassword);
        $this->assertTrue(Hash::check($temporaryPassword, $target->fresh()->password));
        $this->assertTrue($target->fresh()->must_change_password);

        foreach ([
            [$actor, $actor],
            [User::factory()->create(['role' => 'petugas_desa']), $actor],
        ] as [$resetTarget, $resetActor]) {
            try {
                $this->service->resetPassword($resetTarget, $resetActor);
                $this->fail('Petugas password reset must be rejected.');
            } catch (HttpException $exception) {
                $this->assertSame(403, $exception->getStatusCode());
            }
        }
    }
}
