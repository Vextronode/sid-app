<?php

namespace Tests\Feature;

use App\Enums\IncomeRange;
use App\Models\Citizen;
use App\Models\Family;
use App\Models\FamilySocioeconomic;
use App\Models\Village;
use App\Support\AuditContext;
use App\Support\LetterFormSchema;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

/**
 * B1. TTL, alamat, nama orang tua, tanggal kawin/cerai, domisili, status
 * kelainan, serta penghasilan dan aset KK tersimpan sebagai ciphertext,
 * tetapi tetap dibaca sebagai tipe aslinya.
 */
class CitizenEncryptionTest extends TestCase
{
    use RefreshDatabase;

    private const CITIZEN_VALUES = [
        'place_of_birth' => 'Sukabumi',
        'date_of_birth' => '1987-06-05',
        'address' => 'Jl. Merdeka No. 10',
        'father_name_text' => 'Ahmad',
        'mother_name_text' => 'Siti Rahmah',
        'marriage_date' => '2010-02-03',
        'divorce_date' => '2015-04-05',
        'current_domicile' => 'Bandung',
        'has_disorder' => true,
    ];

    public function test_citizen_columns_are_stored_as_ciphertext_and_read_back_typed(): void
    {
        $citizen = Citizen::factory()->create(self::CITIZEN_VALUES);
        $raw = (array) DB::table('citizens')->where('id', $citizen->id)->first();

        foreach (self::CITIZEN_VALUES as $column => $value) {
            $plain = is_bool($value) ? ($value ? '1' : '0') : $value;

            $this->assertNotSame($plain, $raw[$column], "citizens.{$column} masih plaintext");
            $this->assertSame($plain, Crypt::decryptString($raw[$column]), "citizens.{$column}");

            if (! is_bool($value)) {
                $this->assertStringNotContainsString($plain, $raw[$column]);
            }
        }

        $fresh = $citizen->fresh();
        $this->assertInstanceOf(Carbon::class, $fresh->date_of_birth);
        $this->assertSame('1987-06-05', $fresh->date_of_birth->toDateString());
        $this->assertSame('2010-02-03', $fresh->marriage_date->toDateString());
        $this->assertTrue($fresh->has_disorder);
        $this->assertSame('Jl. Merdeka No. 10', $fresh->address);
        $this->assertSame('Siti Rahmah', $fresh->mother_name_text);
    }

    public function test_has_disorder_defaults_to_false_and_nullable_dates_stay_null(): void
    {
        $citizen = Citizen::factory()->create(['marriage_date' => null])->fresh();

        $this->assertFalse($citizen->has_disorder);
        $this->assertNull($citizen->marriage_date);
        $this->assertNull($citizen->getRawOriginal('marriage_date'));
    }

    public function test_saving_unchanged_values_does_not_mark_the_model_dirty(): void
    {
        $citizen = app(AuditContext::class)->muted(fn () => Citizen::factory()->create(self::CITIZEN_VALUES))->fresh();
        $raw = $citizen->getRawOriginal();

        // Formulir mengirim ulang semua isian walau tidak berubah.
        $citizen->fill(self::CITIZEN_VALUES);
        $this->assertFalse($citizen->isDirty());

        // Tanggal dari model yang sudah dibaca juga tidak dianggap berubah.
        $citizen->date_of_birth = $citizen->date_of_birth->copy();
        $citizen->save();

        $this->assertSame($raw['date_of_birth'], $citizen->fresh()->getRawOriginal('date_of_birth'));
        $this->assertSame(0, Activity::query()->count());
    }

    public function test_socioeconomic_income_and_assets_are_encrypted(): void
    {
        $family = Family::factory()->create();
        $socioeconomic = FamilySocioeconomic::query()->create([
            'family_id' => $family->id,
            'household_income_range' => '3-5jt',
            'productive_assets' => ['sawah', 'ternak'],
        ]);
        $raw = (array) DB::table('family_socioeconomics')->where('id', $socioeconomic->id)->first();

        $this->assertStringNotContainsString('3-5jt', $raw['household_income_range']);
        $this->assertStringNotContainsString('sawah', $raw['productive_assets']);

        $fresh = $socioeconomic->fresh();
        $this->assertSame(IncomeRange::from('3-5jt'), $fresh->household_income_range);
        $this->assertSame(['sawah', 'ternak'], $fresh->productive_assets);
    }

    public function test_family_members_are_still_listed_oldest_first(): void
    {
        $village = Village::factory()->create();
        $family = Family::factory()->create(['village_id' => $village->id]);
        $member = fn (string $name, string $born): Citizen => Citizen::factory()->create([
            'village_id' => $village->id,
            'family_id' => $family->id,
            'name' => $name,
            'date_of_birth' => $born,
        ]);
        $child = $member('Anak', '2012-01-01');
        $head = $member('Kepala', '1980-03-04');
        $member('Istri', '1985-12-31');

        $names = (new LetterFormSchema(null, $child))->familyMembers()->pluck('name')->all();

        $this->assertSame(['Kepala', 'Istri', 'Anak'], $names);
        $this->assertSame($head->id, (new LetterFormSchema(null, $child))->familyMembers()->first()->id);
    }
}
