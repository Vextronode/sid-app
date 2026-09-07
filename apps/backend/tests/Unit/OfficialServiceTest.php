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
}
