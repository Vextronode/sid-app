<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Repositories\CitizenRepository;
use App\Services\CitizenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CitizenServiceTest extends TestCase
{
    use RefreshDatabase;

    private CitizenService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new CitizenService(new CitizenRepository);
    }

    public function test_get_all_with_wilayah_returns_all_citizens(): void
    {
        $citizens = Citizen::factory()->count(2)->create();
        $user = $this->testPetugasActor($citizens->first()->village_id);

        $result = $this->service->getAllWithWilayah($user);

        $this->assertCount(2, $result);
    }

    public function test_delete_removes_citizen(): void
    {
        $citizen = Citizen::factory()->create();
        $user = $this->testPetugasActor($citizen->village_id);

        $result = $this->service->delete($citizen, $user);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('citizens', ['id' => $citizen->id]);
    }

    public function test_get_distinct_wilayah_returns_collection(): void
    {
        $citizen = Citizen::factory()->create();
        $user = $this->testPetugasActor($citizen->village_id);

        $result = $this->service->getDistinctWilayah($user);

        $this->assertCount(1, $result);
    }
}
