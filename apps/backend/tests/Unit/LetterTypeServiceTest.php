<?php

namespace Tests\Unit;

use App\Models\LetterType;
use App\Repositories\LetterTypeRepository;
use App\Services\LetterTypeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LetterTypeServiceTest extends TestCase
{
    use RefreshDatabase;

    private LetterTypeService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new LetterTypeService(new LetterTypeRepository);
    }

    public function test_get_active_with_template_returns_only_valid_letter_types(): void
    {
        LetterType::factory()->create(['is_active' => true, 'template' => 'tpl']);
        LetterType::factory()->create(['is_active' => false, 'template' => 'tpl']);

        $result = $this->service->getActiveWithTemplate();

        $this->assertCount(1, $result);
    }
}
