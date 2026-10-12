<?php

namespace Tests\Unit;

use App\Exceptions\OccupationInUseException;
use App\Models\Citizen;
use App\Models\Occupation;
use App\Models\User;
use App\Models\Village;
use App\Repositories\OccupationRepository;
use App\Services\OccupationService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class OccupationServiceTest extends TestCase
{
    use RefreshDatabase;

    private function service(): OccupationService
    {
        return new OccupationService(new OccupationRepository);
    }

    #[Test]
    public function default_occupations_are_seeded_idempotently_for_each_village(): void
    {
        $village = Village::factory()->create();
        $service = $this->service();

        $service->seedDefaultsForVillage($village);
        $service->seedDefaultsForVillage($village);

        $this->assertSame(3, Occupation::where('village_id', $village->id)->count());
        $this->assertSame(
            ['Tidak bekerja', 'Pelajar/Mahasiswa', 'Ibu rumah tangga'],
            Occupation::where('village_id', $village->id)->orderBy('sort_order')->pluck('name')->all(),
        );
    }

    #[Test]
    public function delete_guard_rejects_occupation_used_by_any_citizen(): void
    {
        $village = Village::factory()->create();
        $occupation = Occupation::factory()->create(['village_id' => $village->id]);
        $user = User::factory()->create(['village_id' => $village->id, 'role' => 'petugas_desa']);
        Citizen::factory()->create(['village_id' => $village->id, 'occupation_id' => $occupation->id, 'is_active' => false]);

        try {
            $this->service()->delete($user, $occupation->id);
            $this->fail('Expected occupation-in-use conflict.');
        } catch (OccupationInUseException $exception) {
            $this->assertSame(409, $exception->getStatusCode());
            $this->assertStringContainsString('dipakai 1 warga', $exception->getMessage());
        }
    }

    #[Test]
    public function case_insensitive_name_is_enforced_by_database_index(): void
    {
        $village = Village::factory()->create();
        Occupation::factory()->create(['village_id' => $village->id, 'name' => 'Petani']);

        $this->expectException(QueryException::class);
        Occupation::factory()->create(['village_id' => $village->id, 'name' => 'PETANI']);
    }

    #[Test]
    public function database_restricts_deleting_an_occupation_used_by_a_citizen(): void
    {
        $village = Village::factory()->create();
        $occupation = Occupation::factory()->create(['village_id' => $village->id]);
        Citizen::factory()->create(['village_id' => $village->id, 'occupation_id' => $occupation->id]);

        $this->expectException(QueryException::class);
        $occupation->delete();
    }

    #[Test]
    public function foreign_key_race_is_converted_to_occupation_conflict(): void
    {
        $village = Village::factory()->create();
        $occupation = Occupation::factory()->create(['village_id' => $village->id]);
        $user = User::factory()->create(['village_id' => $village->id, 'role' => 'petugas_desa']);
        $repository = \Mockery::mock(OccupationRepository::class)->makePartial();
        $repository->shouldReceive('findForVillageOrFail')->once()->andReturn($occupation);
        $repository->shouldReceive('delete')->once()->andReturnUsing(function (Occupation $occupation) use ($village) {
            Citizen::factory()->create([
                'village_id' => $village->id,
                'occupation_id' => $occupation->id,
            ]);

            return $occupation->delete();
        });

        $service = new OccupationService($repository);

        try {
            $service->delete($user, $occupation->id);
            $this->fail('Expected occupation-in-use conflict.');
        } catch (OccupationInUseException $exception) {
            $this->assertSame(409, $exception->getStatusCode());
            $this->assertStringContainsString('Pekerjaan masih dipakai', $exception->getMessage());
        }
    }
}
