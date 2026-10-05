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
        $users = User::factory()->count(2)->create();

        $actor = $this->testPetugasActor($users->first()->village_id);
        $this->assertCount(3, $this->service->getAllWithCitizenAndOfficial($actor));
    }

    public function test_toggle_active_flips_status_for_another_user(): void
    {
        $actor = $this->testPetugasActor();
        $target = User::factory()->create(['is_active' => true, 'village_id' => $actor->village_id]);

        $this->assertFalse($this->service->toggleActive($target, $actor)->is_active);
    }

    public function test_toggle_active_rejects_self_deactivation(): void
    {
        $actor = $this->testPetugasActor();

        $this->expectException(HttpException::class);

        $this->service->toggleActive($actor, $actor);
    }

    public function test_update_rejects_self_deactivation_and_allows_deactivating_another_petugas_while_actor_remains(): void
    {
        $actor = $this->testPetugasActor();
        try {
            $this->service->update($actor, ['is_active' => false], $actor);
            $this->fail('Self-deactivation should be rejected.');
        } catch (HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
        }

        $otherPetugas = User::factory()->create(['role' => 'petugas_desa', 'village_id' => $actor->village_id]);
        $this->assertFalse($this->service->update($otherPetugas, ['is_active' => false], $actor)->is_active);
        $this->assertTrue($actor->fresh()->is_active);
    }

    public function test_update_accepts_name_and_status_changes_when_guards_pass(): void
    {
        $actor = $this->testPetugasActor();
        $target = User::factory()->create(['name' => 'Lama', 'village_id' => $actor->village_id]);

        $updated = $this->service->update($target, ['name' => 'Baru'], $actor);

        $this->assertSame('Baru', $updated->name);
        $this->assertTrue($updated->is_active);
    }

    public function test_petugas_can_reset_password_for_non_petugas_but_not_self_or_another_petugas(): void
    {
        $actor = $this->testPetugasActor();
        $target = User::factory()->create(['role' => 'warga', 'village_id' => $actor->village_id]);

        $temporaryPassword = $this->service->resetPassword($target, $actor);

        $this->assertSame(12, strlen($temporaryPassword));
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9]{12}$/', $temporaryPassword);
        $this->assertTrue(Hash::check($temporaryPassword, $target->fresh()->password));
        $this->assertTrue($target->fresh()->must_change_password);

        foreach ([
            [$actor, $actor],
            [User::factory()->create(['role' => 'petugas_desa', 'village_id' => $actor->village_id]), $actor],
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
