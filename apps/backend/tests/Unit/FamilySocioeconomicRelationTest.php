<?php

namespace Tests\Unit;

use App\Enums\IncomeRange;
use App\Models\Citizen;
use App\Models\Family;
use App\Models\FamilySocioeconomic;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class FamilySocioeconomicRelationTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function family_has_null_socioeconomics_when_not_surveyed(): void
    {
        $family = Family::factory()->create();

        $this->assertNull($family->socioeconomics);
    }

    #[Test]
    public function a_family_has_one_unique_socioeconomic_row_with_income_enum_cast(): void
    {
        $family = Family::factory()->create();
        $socioeconomic = FamilySocioeconomic::create([
            'family_id' => $family->id,
            'household_income_range' => '1-3jt',
            'dependents_count' => 3,
        ]);

        $this->assertInstanceOf(FamilySocioeconomic::class, $family->fresh()->socioeconomics);
        $this->assertSame(IncomeRange::ONE_TO_3JT, $family->fresh()->socioeconomics->household_income_range);
        $this->assertSame(3, $socioeconomic->dependents_count);

        $this->expectException(QueryException::class);
        FamilySocioeconomic::create(['family_id' => $family->id]);
    }

    #[Test]
    public function all_members_of_a_family_share_the_same_socioeconomic_row(): void
    {
        $family = Family::factory()->create();
        $first = Citizen::factory()->create(['family_id' => $family->id]);
        $second = Citizen::factory()->create(['family_id' => $family->id]);
        $socioeconomic = FamilySocioeconomic::create(['family_id' => $family->id]);

        $this->assertSame($socioeconomic->id, $family->members()->findOrFail($first->id)->family->socioeconomics->id);
        $this->assertSame($socioeconomic->id, $family->members()->findOrFail($second->id)->family->socioeconomics->id);
    }

    #[Test]
    public function deleting_family_cascades_its_socioeconomic_row(): void
    {
        $family = Family::factory()->create();
        FamilySocioeconomic::create(['family_id' => $family->id]);

        $family->delete();

        $this->assertDatabaseCount('family_socioeconomics', 0);
    }
}
