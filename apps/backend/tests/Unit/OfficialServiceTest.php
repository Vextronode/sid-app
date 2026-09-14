<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use App\Services\OfficialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class OfficialServiceTest extends TestCase
{
    use RefreshDatabase;

    private OfficialService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new OfficialService(
            new OfficialRepository,
            new UserRepository,
        );
    }

    public function test_resolve_rt_for_citizen_returns_active_rt_official(): void
    {
        $rt = Rt::factory()->create();
        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);

        $result = $this->service->resolveRtForCitizen($citizen);

        $this->assertSame($official->id, $result->id);
    }

    public function test_resolve_next_officials_for_rt_returns_rw_officials(): void
    {
        $rw = Rw::factory()->create();
        $rwOfficial = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id, 'is_active' => true]);
        $rtOfficial = Official::factory()->create(['position' => 'rt', 'rw_id' => $rw->id]);

        $result = $this->service->resolveNextOfficials($rtOfficial);

        $this->assertCount(1, $result);
        $this->assertSame($rwOfficial->id, $result->first()->id);
    }

    public function test_resolve_next_officials_for_unknown_position_returns_empty(): void
    {
        $official = Official::factory()->create(['position' => 'kadus']);

        $result = $this->service->resolveNextOfficials($official);

        $this->assertCount(0, $result);
    }

    public function test_resolve_citizen_user_returns_user_by_citizen_id(): void
    {
        $citizen = Citizen::factory()->create();
        $user = User::factory()->create(['citizen_id' => $citizen->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id]);

        $result = $this->service->resolveCitizenUser($letter);

        $this->assertSame($user->id, $result->id);
    }

    public function test_resolve_citizen_user_returns_null_when_no_user_linked(): void
    {
        $citizen = Citizen::factory()->create();
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id]);

        $result = $this->service->resolveCitizenUser($letter);

        $this->assertNull($result);
    }

    public function test_resolve_village_head_returns_active_kepala_desa(): void
    {
        $official = Official::factory()->create(['position' => 'kepala_desa', 'is_active' => true]);

        $result = $this->service->resolveVillageHead();

        $this->assertSame($official->id, $result->id);
    }

    public function test_get_all_with_relations_returns_all_officials(): void
    {
        Official::factory()->count(3)->create();

        $result = $this->service->getAllWithRelations();

        $this->assertCount(3, $result);
    }

    public function test_get_for_show_returns_official_with_relations(): void
    {
        $official = Official::factory()->create();

        $result = $this->service->getForShow($official->id);

        $this->assertSame($official->id, $result->id);
        $this->assertTrue($result->relationLoaded('citizen'));
    }

    public function test_create_persists_new_official(): void
    {
        $citizen = Citizen::factory()->create();

        $official = $this->service->create([
            'citizen_id' => $citizen->id,
            'position' => 'petugas_desa',
            'started_at' => now()->toDateString(),
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('officials', ['id' => $official->id, 'position' => 'petugas_desa']);
    }

    public function test_create_rejects_duplicate_active_position_in_same_scope(): void
    {
        $rt = Rt::factory()->create();
        Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);

        $citizen = Citizen::factory()->create();

        $this->expectException(HttpException::class);

        $this->service->create([
            'citizen_id' => $citizen->id,
            'position' => 'rt',
            'rt_id' => $rt->id,
            'started_at' => now()->toDateString(),
            'is_active' => true,
        ]);
    }

    public function test_create_allows_inactive_duplicate_position(): void
    {
        $rt = Rt::factory()->create();
        Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);

        $citizen = Citizen::factory()->create();

        $official = $this->service->create([
            'citizen_id' => $citizen->id,
            'position' => 'rt',
            'rt_id' => $rt->id,
            'started_at' => now()->toDateString(),
            'is_active' => false,
        ]);

        $this->assertDatabaseHas('officials', ['id' => $official->id, 'is_active' => false]);
    }

    public function test_update_persists_changes_without_conflict(): void
    {
        $official = Official::factory()->create(['position' => 'petugas_desa', 'phone_wa' => '0800']);

        $updated = $this->service->update($official, ['phone_wa' => '0899']);

        $this->assertSame('0899', $updated->phone_wa);
    }

    public function test_update_rejects_when_creating_duplicate_active_position(): void
    {
        $rt = Rt::factory()->create();
        Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);
        $other = Official::factory()->create(['position' => 'kadus', 'is_active' => true]);

        $this->expectException(HttpException::class);

        $this->service->update($other, [
            'position' => 'rt',
            'rt_id' => $rt->id,
            'is_active' => true,
        ]);
    }

    public function test_update_allows_updating_the_same_record_without_conflict(): void
    {
        $rt = Rt::factory()->create();
        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);

        $updated = $this->service->update($official, ['phone_wa' => '0812']);

        $this->assertSame('0812', $updated->phone_wa);
    }

    public function test_delete_removes_official(): void
    {
        $official = Official::factory()->create();

        $this->service->delete($official);

        $this->assertDatabaseMissing('officials', ['id' => $official->id]);
    }
}
