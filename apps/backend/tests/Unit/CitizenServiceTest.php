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
        Citizen::factory()->count(2)->create();

        $result = $this->service->getAllWithWilayah();

        $this->assertCount(2, $result);
    }

    public function test_delete_removes_citizen(): void
    {
        $citizen = Citizen::factory()->create();

        $result = $this->service->delete($citizen);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('citizens', ['id' => $citizen->id]);
    }

    public function test_get_distinct_wilayah_returns_collection(): void
    {
        Citizen::factory()->create();

        $result = $this->service->getDistinctWilayah();

        $this->assertCount(1, $result);
    }
}
