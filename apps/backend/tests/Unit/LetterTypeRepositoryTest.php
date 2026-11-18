<?php

namespace Tests\Unit;

use App\Models\LetterType;
use App\Repositories\LetterTypeRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LetterTypeRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private LetterTypeRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new LetterTypeRepository;
    }

    public function test_find_or_fail_returns_letter_type(): void
    {
        $letterType = LetterType::factory()->create();

        $found = $this->repository->findOrFail($letterType->id);

        $this->assertSame($letterType->id, $found->id);
    }

    public function test_all_submittable_excludes_inactive_and_draft_types(): void
    {
        LetterType::factory()->create(['is_active' => true, 'template' => 'template-a', 'name' => 'B']);
        LetterType::factory()->create(['is_active' => false, 'template' => 'template-b', 'name' => 'A']);
        LetterType::factory()->create(['is_active' => true, 'template' => null, 'name' => 'C']);
        // Layanan pendataan tanpa surat (mis. CPMI) tidak butuh template.
        LetterType::factory()->create(['is_active' => true, 'template' => null, 'produces_letter' => false, 'name' => 'D']);
        LetterType::factory()->create(['is_active' => false, 'template' => null, 'produces_letter' => false, 'name' => 'E']);

        $result = $this->repository->allSubmittable();

        $this->assertSame(['B', 'D'], $result->pluck('name')->all());
    }
}
