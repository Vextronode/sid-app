<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Rt;
use App\Models\User;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use App\Services\OfficialService;
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

        $this->service = new UserService(
            new UserRepository,
            new OfficialService(new OfficialRepository, new UserRepository, new LetterRepository),
        );
    }

    public function test_get_all_with_citizen_and_official_returns_users(): void
    {
        User::factory()->count(2)->create();

        $result = $this->service->getAllWithCitizenAndOfficial();

        $this->assertCount(2, $result);
    }

    public function test_toggle_active_flips_status(): void
    {
        $user = User::factory()->create(['is_active' => true]);

        $result = $this->service->toggleActive($user);

        $this->assertFalse($result->is_active);
    }

    public function test_create_persists_user_with_hashed_password(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa', 'village_id' => null]);
        $citizen = Citizen::factory()->create();

        $user = $this->service->create([
            'name' => 'Ahmad Budiman',
            'email' => 'ahmad@cibenda.desa.id',
            'password' => 'Password123!',
            'role' => 'rt',
            'citizen_id' => $citizen->id,
        ], $admin);

        $this->assertSame('rt', $user->role);
        $this->assertTrue(Hash::check('Password123!', $user->password));
        $this->assertSame($admin->village_id, $user->village_id);
    }

    public function test_create_with_position_data_also_creates_active_official(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $citizen = Citizen::factory()->create();
        $rt = Rt::factory()->create();

        $user = $this->service->create([
            'name' => 'Ketua RT',
            'email' => 'rt@cibenda.desa.id',
            'password' => 'Password123!',
            'role' => 'rt',
            'citizen_id' => $citizen->id,
            'position_data' => [
                'position' => 'rt',
                'rt_id' => $rt->id,
                'started_at' => now()->toDateString(),
            ],
        ], $admin);

        $this->assertNotNull($user->official);
        $this->assertSame('rt', $user->official->position);
        $this->assertTrue($user->official->is_active);
    }

    public function test_create_with_sekdes_position_overrides_role(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $citizen = Citizen::factory()->create();

        $user = $this->service->create([
            'name' => 'Calon Sekdes',
            'email' => 'sekdes@cibenda.desa.id',
            'password' => 'Password123!',
            'role' => 'rt',
            'citizen_id' => $citizen->id,
            'position_data' => [
                'position' => 'sekdes',
                'started_at' => now()->toDateString(),
            ],
        ], $admin);

        $this->assertSame('sekretaris_desa', $user->role);
    }

    public function test_update_rejects_self_deactivation(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);

        $this->expectException(HttpException::class);

        $this->service->update($admin, ['is_active' => false], $admin);
    }

    public function test_update_rejects_deactivating_last_active_petugas_desa(): void
    {
        // Aktor tidak perlu petugas_desa di level Service murni (guard
        // role aktor sudah ditegakkan middleware, bukan Service ini) -
        // yang relevan di sini cuma: $lastPetugas adalah SATU-SATUNYA
        // petugas_desa aktif yang tersisa.
        $actor = User::factory()->create(['role' => 'rt']);
        $lastPetugas = User::factory()->create(['role' => 'petugas_desa', 'is_active' => true]);

        $this->expectException(HttpException::class);

        $this->service->update($lastPetugas, ['is_active' => false], $actor);
    }

    public function test_update_allows_deactivating_petugas_desa_when_another_remains(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $target = User::factory()->create(['role' => 'petugas_desa']);
        User::factory()->create(['role' => 'petugas_desa']);

        $result = $this->service->update($target, ['is_active' => false], $admin);

        $this->assertFalse($result->is_active);
    }

    public function test_update_allows_deactivating_non_petugas_desa_by_someone_else(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $target = User::factory()->create(['role' => 'rt']);

        $result = $this->service->update($target, ['is_active' => false], $admin);

        $this->assertFalse($result->is_active);
    }

    public function test_update_changes_name_without_touching_active_status(): void
    {
        $admin = User::factory()->create(['role' => 'petugas_desa']);
        $target = User::factory()->create(['name' => 'Lama']);

        $result = $this->service->update($target, ['name' => 'Baru'], $admin);

        $this->assertSame('Baru', $result->name);
        $this->assertTrue($result->is_active);
    }
}
