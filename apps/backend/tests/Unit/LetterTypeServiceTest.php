<?php

namespace Tests\Unit;

use App\Models\ApprovalFlow;
use App\Models\LetterCategory;
use App\Models\LetterType;
use App\Repositories\ApprovalFlowRepository;
use App\Repositories\LetterTypeRepository;
use App\Services\LetterTypeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
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

    public function test_get_active_with_template_returns_only_valid_letter_types(): void
    {
        LetterType::factory()->create(['is_active' => true, 'template' => 'tpl']);
        LetterType::factory()->create(['is_active' => false, 'template' => 'tpl']);

        $result = $this->service->getActiveWithTemplate();

        $this->assertCount(1, $result);
    }

    public function test_update_changes_editable_fields(): void
    {
        $letterType = LetterType::factory()->create(['validity_days' => 30, 'is_active' => true]);

        $result = $this->service->update($letterType, [
            'validity_days' => 90,
            'is_active' => false,
        ]);

        $this->assertSame(90, $result->validity_days);
        $this->assertFalse($result->is_active);
    }

    public function test_update_moves_letter_type_to_a_flow_in_the_same_category(): void
    {
        $category = LetterCategory::factory()->create();
        $oldFlow = ApprovalFlow::factory()->create(['category_id' => $category->id]);
        $newFlow = ApprovalFlow::factory()->create(['category_id' => $category->id]);
        $letterType = LetterType::factory()->create(['category_id' => $category->id, 'flow_id' => $oldFlow->id]);

        $result = $this->service->update($letterType, ['flow_id' => $newFlow->id]);

        $this->assertSame($newFlow->id, $result->flow_id);
    }

    public function test_update_rejects_flow_from_a_different_category(): void
    {
        $category = LetterCategory::factory()->create();
        $otherCategory = LetterCategory::factory()->create();
        $flowInOtherCategory = ApprovalFlow::factory()->create(['category_id' => $otherCategory->id]);
        $letterType = LetterType::factory()->create(['category_id' => $category->id]);

        $this->expectException(ValidationException::class);

        $this->service->update($letterType, ['flow_id' => $flowInOtherCategory->id]);
    }

    public function test_update_validates_flow_against_new_category_when_both_change_together(): void
    {
        $newCategory = LetterCategory::factory()->create();
        $matchingFlow = ApprovalFlow::factory()->create(['category_id' => $newCategory->id]);
        $letterType = LetterType::factory()->create();

        $result = $this->service->update($letterType, [
            'category_id' => $newCategory->id,
            'flow_id' => $matchingFlow->id,
        ]);

        $this->assertSame($newCategory->id, $result->category_id);
        $this->assertSame($matchingFlow->id, $result->flow_id);
    }
}
