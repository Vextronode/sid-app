<?php

namespace Tests\Unit;

use App\Models\LetterType;
use App\Models\Village;
use App\Repositories\LetterNumberCounterRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LetterNumberCounterRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private LetterNumberCounterRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new LetterNumberCounterRepository;
    }

    public function test_next_number_increments_sequentially_for_matching_village_classification_and_year(): void
    {
        $village = Village::factory()->create();
        $letterType = LetterType::factory()->create();

        DB::transaction(function () use ($village) {
            $this->assertSame(1, $this->repository->nextNumber($village->id, '470', 2026));
            $this->assertSame(2, $this->repository->nextNumber($village->id, '470', 2026));
        });
    }

    public function test_next_number_keeps_ranges_separate_per_year_and_classification(): void
    {
        $village = Village::factory()->create();
        $letterTypeA = LetterType::factory()->create();
        $letterTypeB = LetterType::factory()->create();

        DB::transaction(function () use ($village) {
            $this->assertSame(1, $this->repository->nextNumber($village->id, '470', 2026));
            $this->assertSame(1, $this->repository->nextNumber($village->id, '510', 2026));
            $this->assertSame(1, $this->repository->nextNumber($village->id, '470', 2027));
        });
    }
}
