<?php

namespace Tests\Unit;

use App\Models\Hamlet;
use App\Models\Rw;
use App\Repositories\RwRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RwRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private RwRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new RwRepository;
    }

    public function test_all_ordered_by_number_filters_by_hamlet_when_given(): void
    {
        $hamletA = Hamlet::factory()->create();
        $hamletB = Hamlet::factory()->create();
        Rw::factory()->create(['hamlet_id' => $hamletA->id, 'number' => '002']);
        Rw::factory()->create(['hamlet_id' => $hamletA->id, 'number' => '001']);
        Rw::factory()->create(['hamlet_id' => $hamletB->id, 'number' => '001']);

        $result = $this->repository->allOrderedByNumber($hamletA->id);

        $this->assertCount(2, $result);
        $this->assertSame('001', $result->first()->number);
    }

    public function test_all_ordered_by_number_returns_all_when_no_filter(): void
    {
        Rw::factory()->count(3)->create();

        $result = $this->repository->allOrderedByNumber();

        $this->assertCount(3, $result);
    }

    public function test_create_persists_rw(): void
    {
        $hamlet = Hamlet::factory()->create();

        $rw = $this->repository->create([
            'hamlet_id' => $hamlet->id,
            'number' => '001',
            'full_label' => 'RW 001',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('rws', ['id' => $rw->id, 'full_label' => 'RW 001']);
    }

    public function test_find_or_fail_returns_rw(): void
    {
        $rw = Rw::factory()->create();

        $found = $this->repository->findOrFail($rw->id);

        $this->assertSame($rw->id, $found->id);
    }

    public function test_update_persists_changes(): void
    {
        $rw = Rw::factory()->create(['number' => '001']);

        $updated = $this->repository->update($rw, ['number' => '002']);

        $this->assertSame('002', $updated->number);
    }

    public function test_delete_removes_rw(): void
    {
        $rw = Rw::factory()->create();

        $this->repository->delete($rw);

        $this->assertDatabaseMissing('rws', ['id' => $rw->id]);
    }
}
