<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\CitizenSocioeconomic;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CitizenSocioeconomicRelationTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function citizen_has_socioeconomics_relation_returning_null_when_empty(): void
    {
        $citizen = Citizen::factory()->create();

        // Relasi HasOne harus return null bila belum ada data sosioekonomi
        $this->assertNull($citizen->socioeconomics);
    }

    #[Test]
    public function citizen_can_have_socioeconomic_data_created_and_retrieved(): void
    {
        $citizen = Citizen::factory()->create();

        CitizenSocioeconomic::create([
            'citizen_id' => $citizen->id,
        ]);

        $fresh = $citizen->fresh();

        $this->assertNotNull($fresh->socioeconomics);
        $this->assertInstanceOf(CitizenSocioeconomic::class, $fresh->socioeconomics);
        $this->assertEquals($citizen->id, $fresh->socioeconomics->citizen_id);
    }

    #[Test]
    public function citizen_socioeconomic_stores_optional_fields_correctly(): void
    {
        $citizen = Citizen::factory()->create();

        CitizenSocioeconomic::create([
            'citizen_id' => $citizen->id,
            'income_range' => '1-3jt',
            'dependents_count' => 3,
        ]);

        $socioeconomic = $citizen->fresh()->socioeconomics;

        $this->assertNotNull($socioeconomic);
        $this->assertEquals('1-3jt', $socioeconomic->income_range->value);
        $this->assertEquals(3, $socioeconomic->dependents_count);
    }

    #[Test]
    public function citizen_socioeconomic_is_unique_per_citizen(): void
    {
        $citizen = Citizen::factory()->create();

        CitizenSocioeconomic::create(['citizen_id' => $citizen->id]);

        // Duplicate insert harus throw karena UNIQUE constraint citizen_id
        $this->expectException(QueryException::class);

        CitizenSocioeconomic::create(['citizen_id' => $citizen->id]);
    }
}
