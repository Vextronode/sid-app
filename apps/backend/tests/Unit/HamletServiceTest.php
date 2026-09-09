<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\User;
use App\Models\Village;
use App\Repositories\CitizenRepository;
use App\Repositories\HamletRepository;
use App\Services\HamletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class HamletServiceTest extends TestCase
{
    use RefreshDatabase;

    private HamletService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new HamletService(
            new HamletRepository,
            new CitizenRepository,
        );
    }

    public function test_create_sets_village_id_from_user_and_defaults_is_active_true(): void
    {
        $village = Village::factory()->create();
        $user = User::factory()->create(['village_id' => $village->id]);

        $hamlet = $this->service->create(['name' => 'Dusun Patrol', 'code' => 'PTR'], $user);

        $this->assertSame($village->id, $hamlet->village_id);
        $this->assertTrue($hamlet->is_active);
        $this->assertDatabaseHas('hamlets', ['code' => 'PTR', 'village_id' => $village->id]);
    }

    public function test_update_allows_change_when_no_active_citizens(): void
    {
        $hamlet = Hamlet::factory()->create(['is_active' => true]);

        $updated = $this->service->update($hamlet, ['is_active' => false]);

        $this->assertFalse($updated->is_active);
    }

    public function test_update_blocks_deactivation_when_active_citizens_exist(): void
    {
        $hamlet = Hamlet::factory()->create(['is_active' => true]);
        Citizen::factory()->create(['hamlet_id' => $hamlet->id, 'is_active' => true]);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Dusun tidak bisa dinonaktifkan karena masih ada warga aktif terdaftar di wilayah ini.');

        $this->service->update($hamlet, ['is_active' => false]);
    }

    public function test_update_allows_deactivation_when_only_inactive_citizens_exist(): void
    {
        $hamlet = Hamlet::factory()->create(['is_active' => true]);
        Citizen::factory()->create(['hamlet_id' => $hamlet->id, 'is_active' => false]);

        $updated = $this->service->update($hamlet, ['is_active' => false]);

        $this->assertFalse($updated->is_active);
    }

    public function test_delete_removes_hamlet_without_citizens(): void
    {
        $hamlet = Hamlet::factory()->create();

        $result = $this->service->delete($hamlet);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('hamlets', ['id' => $hamlet->id]);
    }

    public function test_delete_is_blocked_when_citizens_still_registered(): void
    {
        $hamlet = Hamlet::factory()->create();
        Citizen::factory()->create(['hamlet_id' => $hamlet->id]);

        $this->expectException(HttpException::class);
        $this->service->delete($hamlet);
    }
}
