<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Family;
use App\Repositories\CitizenRepository;
use App\Repositories\FamilyRepository;
use App\Services\CitizenService;
use App\Services\FamilyService;
use App\Services\PopulationAuditService;
use App\Support\AuditContext;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Mockery;
use Tests\TestCase;

/**
 * Keunikan data kependudukan dijaga juga di database: satu kepala keluarga
 * aktif per KK (partial unique index), NIK, dan No KK. Kejadian bersamaan
 * tidak bisa direproduksi di SQLite, jadi "dua penyimpanan sama-sama lolos
 * guard" disimulasikan dengan guard repository yang selalu lolos.
 */
class PopulationUniqueIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_rejects_a_second_active_head_in_the_same_family(): void
    {
        $family = Family::factory()->create();
        Citizen::factory()->create(['family_id' => $family->id, 'family_role' => 'kepala_keluarga']);

        $this->expectException(UniqueConstraintViolationException::class);

        Citizen::factory()->create(['family_id' => $family->id, 'family_role' => 'kepala_keluarga']);
    }

    public function test_index_only_covers_active_heads_per_family(): void
    {
        $family = Family::factory()->create();
        $otherFamily = Family::factory()->create();

        // Kepala lama yang sudah nonaktif tidak menghalangi pengganti.
        Citizen::factory()->create(['family_id' => $family->id, 'family_role' => 'kepala_keluarga', 'is_active' => false]);
        Citizen::factory()->create(['family_id' => $family->id, 'family_role' => 'kepala_keluarga']);
        Citizen::factory()->count(2)->create(['family_id' => $family->id, 'family_role' => 'anak']);
        Citizen::factory()->create(['family_id' => $otherFamily->id, 'family_role' => 'kepala_keluarga']);
        Citizen::factory()->count(2)->create(['family_id' => null, 'family_role' => 'kepala_keluarga']);

        $this->assertSame(4, Citizen::query()->where('family_role', 'kepala_keluarga')->where('is_active', true)->count());
    }

    public function test_concurrent_second_head_is_rejected_as_422_on_family_role(): void
    {
        $family = Family::factory()->create();
        Citizen::factory()->create(['family_id' => $family->id, 'family_role' => 'kepala_keluarga']);
        $member = Citizen::factory()->create(['family_id' => $family->id, 'family_role' => 'anak', 'rt_id' => null]);
        $user = $this->makeStafSidActor($family->village_id);

        $repository = Mockery::mock(CitizenRepository::class)->makePartial();
        $repository->shouldReceive('existsFamilyHead')->andReturnFalse();
        $service = new CitizenService($repository, new PopulationAuditService, new AuditContext);

        $this->assertValidationErrorOn('family_role', fn () => $service->create(
            $this->citizenData(['family_id' => $family->id, 'family_role' => 'kepala_keluarga']),
            $user,
        ));
        $this->assertValidationErrorOn('family_role', fn () => $service->update($member, ['family_role' => 'kepala_keluarga'], $user));

        $this->assertSame('anak', $member->fresh()->family_role->value);
        $this->assertSame(2, Citizen::query()->where('family_id', $family->id)->count());
    }

    public function test_concurrent_duplicate_nik_is_rejected_as_422(): void
    {
        $existing = Citizen::factory()->create(['nik' => '3207010101900001']);
        $user = $this->makeStafSidActor($existing->village_id);

        $repository = Mockery::mock(CitizenRepository::class)->makePartial();
        $repository->shouldReceive('findByNikHash')->andReturnNull();
        $service = new CitizenService($repository, new PopulationAuditService, new AuditContext);

        $this->assertValidationErrorOn('nik', fn () => $service->create($this->citizenData(['nik' => '3207010101900001']), $user));
        $this->assertSame(1, Citizen::query()->count());
    }

    public function test_concurrent_duplicate_family_number_is_rejected_as_422(): void
    {
        $existing = Family::factory()->create(['no_kk' => '3207010101900002']);
        $user = $this->makeStafSidActor($existing->village_id);

        $repository = Mockery::mock(FamilyRepository::class)->makePartial();
        $repository->shouldReceive('findByNoKkHash')->andReturnNull();
        $service = new FamilyService($repository);

        $this->assertValidationErrorOn('no_kk', fn () => $service->create([
            'no_kk' => '3207010101900002',
            'family_address' => 'Jl. Desa',
        ], $user));
        $this->assertSame(1, Family::query()->count());
    }

    /**
     * @return array<string, mixed>
     */
    private function citizenData(array $overrides = []): array
    {
        return [
            'nik' => '3207010101900003',
            'name' => 'Warga Baru',
            'date_of_birth' => '1990-01-01',
            'gender' => 'L',
            'address' => 'Jl. Desa',
            ...$overrides,
        ];
    }

    private function assertValidationErrorOn(string $field, callable $call): void
    {
        try {
            $call();
            $this->fail("Seharusnya ditolak dengan galat validasi pada {$field}.");
        } catch (ValidationException $exception) {
            $this->assertSame([$field], array_keys($exception->errors()));
        }
    }
}
