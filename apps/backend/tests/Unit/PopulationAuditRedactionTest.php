<?php

namespace Tests\Unit;

use App\Casts\EncryptedCast;
use App\Models\Citizen;
use App\Models\Family;
use App\Models\FamilySocioeconomic;
use App\Models\User;
use App\Services\PopulationAuditService;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

/**
 * A5. Kolom yang disamarkan di Log Aktivitas mengikuti cast model, bukan
 * daftar manual: kolom yang baru dienkripsi otomatis ikut disamarkan.
 */
class PopulationAuditRedactionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  class-string<Model>  $modelClass
     */
    #[DataProvider('populationModelProvider')]
    public function test_every_encrypted_cast_is_sensitive(string $modelClass): void
    {
        $model = new $modelClass;
        $service = new PopulationAuditService;

        foreach (self::encryptedFields($model) as $field) {
            $this->assertTrue($service->isSensitive($model, $field), "{$modelClass}::{$field} harus disamarkan.");
        }

        $this->assertFalse($service->isSensitive($model, 'name'));
    }

    public static function populationModelProvider(): array
    {
        return [
            [Citizen::class],
            [Family::class],
            [FamilySocioeconomic::class],
        ];
    }

    public function test_encrypted_values_are_logged_as_redacted(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'staf_sid']));

        $family = Family::factory()->create(['no_kk' => '3201011234560001', 'family_address' => 'Jl. Rahasia 1']);
        $citizen = Citizen::factory()->create([
            'family_id' => $family->id,
            'nik' => '3201011234560002',
            'place_of_birth' => 'Kota Rahasia',
            'date_of_birth' => '1987-06-05',
            'address' => 'Jl. Rahasia 2',
            'father_name_text' => 'Ayah Rahasia',
            'mother_name_text' => 'Ibu Rahasia',
            'current_domicile' => 'Domisili Rahasia',
            'birth_certificate_number' => 'AL-0001',
            'marriage_certificate_number' => 'BN-0001',
            'marriage_date' => '2010-02-03',
            'divorce_certificate_number' => 'AC-0001',
            'divorce_date' => '2015-04-05',
            'has_disorder' => true,
            'disability' => 'tuna_netra',
        ]);
        $socioeconomic = FamilySocioeconomic::query()->create([
            'family_id' => $family->id,
            'household_income_range' => '3-5jt',
            'productive_assets' => ['sawah_rahasia'],
        ]);
        $citizen->update(['birth_certificate_number' => 'AL-0002']);

        $logged = fn (Model $subject, string $event): array => Activity::query()
            ->where('subject_id', $subject->getKey())
            ->where('event', $event)
            ->sole()
            ->properties['changes'];

        foreach (self::encryptedFields($citizen) as $field) {
            $this->assertSame(PopulationAuditService::REDACTED, $logged($citizen, 'created')[$field]['new'], "citizens.{$field}");
        }

        foreach (self::encryptedFields($family) as $field) {
            $this->assertSame(PopulationAuditService::REDACTED, $logged($family, 'created')[$field]['new'], "families.{$field}");
        }

        // Sosio-ekonomi tercatat sebagai riwayat KK-nya.
        foreach (self::encryptedFields($socioeconomic) as $field) {
            $this->assertSame(PopulationAuditService::REDACTED, $logged($family, 'socioeconomic_updated')[$field]['new'], "family_socioeconomics.{$field}");
        }

        $updated = $logged($citizen, 'updated');
        $this->assertSame(['old' => PopulationAuditService::REDACTED, 'new' => PopulationAuditService::REDACTED], $updated['birth_certificate_number']);

        $json = Activity::query()->pluck('properties')->toJson();
        foreach ([
            '3201011234560001', '3201011234560002', 'Jl. Rahasia', 'Kota Rahasia', '1987-06-05', 'Ayah Rahasia',
            'Ibu Rahasia', 'Domisili Rahasia', 'AL-0001', 'AL-0002', '2010-02-03', '2015-04-05', 'tuna_netra',
            '3-5jt', 'sawah_rahasia',
        ] as $secret) {
            $this->assertStringNotContainsString($secret, $json);
        }
    }

    /**
     * Kolom bercast `encrypted*` bawaan atau cast kustom terenkripsi.
     *
     * @return list<string>
     */
    private static function encryptedFields(Model $model): array
    {
        return array_keys(array_filter($model->getCasts(), function (mixed $cast): bool {
            $class = is_string($cast) ? explode(':', $cast, 2)[0] : null;

            return $class !== null
                && (str_starts_with($class, 'encrypted') || is_subclass_of($class, EncryptedCast::class));
        }));
    }

    public function test_custom_encrypted_cast_is_sensitive(): void
    {
        $cast = new class implements CastsAttributes, EncryptedCast
        {
            public function get(Model $model, string $key, mixed $value, array $attributes): mixed
            {
                return $value;
            }

            public function set(Model $model, string $key, mixed $value, array $attributes): mixed
            {
                return $value;
            }
        };
        $model = new class extends Model {};
        $model->mergeCasts(['secret_date' => $cast::class, 'plain_date' => 'date']);

        $service = new PopulationAuditService;
        $this->assertTrue($service->isSensitive($model, 'secret_date'));
        $this->assertFalse($service->isSensitive($model, 'plain_date'));
    }
}
