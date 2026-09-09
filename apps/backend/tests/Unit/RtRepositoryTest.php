<?php

namespace Tests\Unit;

use App\Models\Rt;
use App\Models\Rw;
use App\Repositories\RtRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RtRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private RtRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new RtRepository;
    }

    public function test_all_ordered_by_number_filters_by_rw_when_given(): void
    {
        $rwA = Rw::factory()->create();
        $rwB = Rw::factory()->create();
        Rt::factory()->create(['rw_id' => $rwA->id, 'number' => '002']);
        Rt::factory()->create(['rw_id' => $rwA->id, 'number' => '001']);
        Rt::factory()->create(['rw_id' => $rwB->id, 'number' => '001']);

        $result = $this->repository->allOrderedByNumber($rwA->id);

        $this->assertCount(2, $result);
        $this->assertSame('001', $result->first()->number);
    }

    public function test_create_persists_rt(): void
    {
        $rw = Rw::factory()->create();

        $rt = $this->repository->create([
            'rw_id' => $rw->id,
            'number' => '001',
            'full_label' => 'RT 001 / RW 001',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('rts', ['id' => $rt->id, 'full_label' => 'RT 001 / RW 001']);
    }

    public function test_update_persists_changes(): void
    {
        $rt = Rt::factory()->create(['number' => '001']);

        $updated = $this->repository->update($rt, ['number' => '002']);

        $this->assertSame('002', $updated->number);
    }

    public function test_delete_removes_rt(): void
    {
        $rt = Rt::factory()->create();

        $this->repository->delete($rt);

        $this->assertDatabaseMissing('rts', ['id' => $rt->id]);
    }
}
