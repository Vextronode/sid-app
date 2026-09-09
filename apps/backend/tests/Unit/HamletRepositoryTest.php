<?php

namespace Tests\Unit;

use App\Models\Hamlet;
use App\Models\Village;
use App\Repositories\HamletRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HamletRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private HamletRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new HamletRepository;
    }

    public function test_all_ordered_by_name_returns_hamlets_sorted_alphabetically(): void
    {
        $village = Village::factory()->create();
        Hamlet::factory()->create(['name' => 'Dusun Ciseureuh', 'village_id' => $village->id]);
        Hamlet::factory()->create(['name' => 'Dusun Ancol', 'village_id' => $village->id]);

        $result = $this->repository->allOrderedByName();

        $this->assertCount(2, $result);
        $this->assertSame('Dusun Ancol', $result->first()->name);
    }

    public function test_create_persists_hamlet(): void
    {
        $village = Village::factory()->create();

        $hamlet = $this->repository->create([
            'name' => 'Dusun Patrol',
            'code' => 'PTR',
            'village_id' => $village->id,
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('hamlets', [
            'id' => $hamlet->id,
            'code' => 'PTR',
        ]);
    }

    public function test_update_persists_changes(): void
    {
        $hamlet = Hamlet::factory()->create(['name' => 'Dusun Lama']);

        $updated = $this->repository->update($hamlet, ['name' => 'Dusun Baru']);

        $this->assertSame('Dusun Baru', $updated->name);
        $this->assertDatabaseHas('hamlets', ['id' => $hamlet->id, 'name' => 'Dusun Baru']);
    }

    public function test_delete_removes_hamlet(): void
    {
        $hamlet = Hamlet::factory()->create();

        $this->repository->delete($hamlet);

        $this->assertDatabaseMissing('hamlets', ['id' => $hamlet->id]);
    }
}
