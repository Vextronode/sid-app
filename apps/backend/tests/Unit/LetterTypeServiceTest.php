<?php

namespace Tests\Unit;

use App\Models\LetterType;
use App\Repositories\ApprovalFlowRepository;
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

        $this->service = new LetterTypeService(
            new LetterTypeRepository,
            new ApprovalFlowRepository,
        );
    }

    public function test_list_returns_only_valid_letter_types_by_default(): void
    {
        LetterType::factory()->create(['is_active' => true, 'template' => 'tpl']);
        LetterType::factory()->create(['is_active' => false, 'template' => 'tpl']);

        $result = $this->service->list($this->makeStafSidActor());

        $this->assertCount(1, $result);
    }

    public function test_list_with_include_inactive_returns_draft_and_inactive_types(): void
    {
        LetterType::factory()->create(['is_active' => true, 'template' => 'tpl']);
        LetterType::factory()->create(['is_active' => false, 'template' => 'tpl']);
        LetterType::factory()->create(['is_active' => false, 'template' => null]);

        $result = $this->service->list($this->makeStafSidActor(), includeInactive: true);

        $this->assertCount(3, $result);
    }

    public function test_update_changes_editable_fields(): void
    {
        $letterType = LetterType::factory()->create(['validity_days' => 30, 'is_active' => true]);

        $result = $this->service->update($letterType, [
            'validity_days' => 90,
            'is_active' => false,
        ], $this->makeStafSidActor($letterType->village_id));

        $this->assertSame(90, $result->validity_days);
        $this->assertFalse($result->is_active);
    }
}
