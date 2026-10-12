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

    public function test_all_active_with_template_excludes_inactive_and_null_template(): void
    {
        LetterType::factory()->create(['is_active' => true, 'template' => 'template-a', 'name' => 'B']);
        LetterType::factory()->create(['is_active' => false, 'template' => 'template-b', 'name' => 'A']);
        LetterType::factory()->create(['is_active' => true, 'template' => null, 'name' => 'C']);

        $result = $this->repository->allActiveWithTemplate();

        $this->assertCount(1, $result);
        $this->assertSame('template-a', $result->first()->template);
    }
}
