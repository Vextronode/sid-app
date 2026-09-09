<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Repositories\CitizenRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CitizenRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private CitizenRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new CitizenRepository;
    }

    public function test_all_with_wilayah_returns_citizens_ordered_by_name(): void
    {
        Citizen::factory()->create(['name' => 'Zainal']);
        Citizen::factory()->create(['name' => 'Anisa']);

        $result = $this->repository->allWithWilayah();

        $this->assertCount(2, $result);
        $this->assertSame('Anisa', $result->first()->name);
        $this->assertTrue($result->first()->relationLoaded('rt'));
        $this->assertTrue($result->first()->relationLoaded('village'));
    }

    public function test_delete_removes_citizen(): void
    {
        $citizen = Citizen::factory()->create();

        $this->repository->delete($citizen);

        $this->assertDatabaseMissing('citizens', ['id' => $citizen->id]);
    }

    public function test_distinct_wilayah_returns_unique_rt_rw_pairs(): void
    {
        $citizenA = Citizen::factory()->create();
        Citizen::factory()->create(['rt_id' => $citizenA->rt_id, 'rw_id' => $citizenA->rw_id]);

        $result = $this->repository->distinctWilayah();

        $this->assertCount(1, $result);
    }

    public function test_exists_by_hamlet_and_exists_active_by_hamlet(): void
    {
        $citizen = Citizen::factory()->create(['is_active' => false]);

        $this->assertTrue($this->repository->existsByHamlet($citizen->hamlet_id));
        $this->assertFalse($this->repository->existsActiveByHamlet($citizen->hamlet_id));

        $citizen->update(['is_active' => true]);

        $this->assertTrue($this->repository->existsActiveByHamlet($citizen->hamlet_id));
    }

    public function test_exists_by_rw_and_exists_active_by_rw(): void
    {
        $citizen = Citizen::factory()->create(['is_active' => true]);

        $this->assertTrue($this->repository->existsByRw($citizen->rw_id));
        $this->assertTrue($this->repository->existsActiveByRw($citizen->rw_id));
    }

    public function test_exists_by_rt_and_exists_active_by_rt(): void
    {
        $citizen = Citizen::factory()->create(['is_active' => true]);

        $this->assertTrue($this->repository->existsByRt($citizen->rt_id));
        $this->assertTrue($this->repository->existsActiveByRt($citizen->rt_id));
    }
}
