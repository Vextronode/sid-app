<?php

namespace Tests\Unit;

use App\Enums\BloodType;
use App\Enums\FamilyRole;
use App\Enums\ResidencyType;
use App\Models\Citizen;
use App\Models\Family;
use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-3-S4 — Unit test untuk relasi & cast baru model Citizen.
 *
 * PENTING: test ini butuh tabel `families` (EV5-3-S1) ikut termigrasi
 * karena citizens.family_id sekarang FK ke families.id (ditambahkan lewat
 * migration terpisah 2026_09_12_..._add_family_id_foreign_to_citizens_table,
 * karena families dibuat setelah citizens secara kronologis).
 *
 * Cakupan kondisi:
 *  - family() mengembalikan Family yang benar via family_id.
 *  - father()/mother() self-reference ke Citizen lain via father_id/mother_id.
 *  - nik di-cast encrypted, tapi nik_hash tetap ter-generate benar dari
 *    plaintext (bukan dari ciphertext) lewat booted() hook.
 *  - blood_type/residency_type/family_role di-cast ke enum PHP yang benar.
 */
class CitizenModelTest extends TestCase
{
    use RefreshDatabase;

    private function baseCitizenData(): array
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $hamlet = Hamlet::create(['village_id' => $village->id, 'name' => 'Cibenda', 'code' => 'CBD01', 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'number' => '001', 'full_label' => 'RW 001', 'is_active' => true]);
        $rt = Rt::create(['rw_id' => $rw->id, 'number' => '001', 'full_label' => 'RT 001 / RW 001', 'is_active' => true]);

        return [
            'village_id' => $village->id,
            'hamlet_id' => $hamlet->id,
            'rw_id' => $rw->id,
            'rt_id' => $rt->id,
        ];
    }

    #[Test]
    public function family_relation_resolves_correctly(): void
    {
        $base = $this->baseCitizenData();

        $family = Family::create([
            'village_id' => $base['village_id'],
            'no_kk' => '3218030101010000',
            'family_address' => 'Desa Cibenda',
            'family_status' => 'aktif',
            'rt_id' => $base['rt_id'],
            'rw_id' => $base['rw_id'],
            'hamlet_id' => $base['hamlet_id'],
        ]);

        $citizen = Citizen::create([
            ...$base,
            'nik' => '3218030101010001',
            'name' => 'Siti Aminah',
            'date_of_birth' => '1990-05-12',
            'gender' => 'P',
            'address' => 'Desa Cibenda',
            'family_id' => $family->id,
            'family_role' => 'istri',
        ]);

        $this->assertTrue($citizen->family->is($family));
        $this->assertTrue($family->members->contains($citizen));
        $this->assertSame(FamilyRole::ISTRI, $citizen->family_role);
    }

    #[Test]
    public function father_and_mother_self_reference_resolve_correctly(): void
    {
        $base = $this->baseCitizenData();

        $father = Citizen::create([
            ...$base,
            'nik' => '3218030101010002',
            'name' => 'Bapak Ujang',
            'date_of_birth' => '1970-01-01',
            'gender' => 'L',
            'address' => 'Desa Cibenda',
        ]);

        $mother = Citizen::create([
            ...$base,
            'nik' => '3218030101010003',
            'name' => 'Ibu Aminah',
            'date_of_birth' => '1972-01-01',
            'gender' => 'P',
            'address' => 'Desa Cibenda',
        ]);

        $child = Citizen::create([
            ...$base,
            'nik' => '3218030101010004',
            'name' => 'Anak Budi',
            'date_of_birth' => '1995-01-01',
            'gender' => 'L',
            'address' => 'Desa Cibenda',
            'father_id' => $father->id,
            'mother_id' => $mother->id,
        ]);

        $this->assertTrue($child->father->is($father));
        $this->assertTrue($child->mother->is($mother));
    }

    #[Test]
    public function nik_is_encrypted_but_nik_hash_still_generated_from_plaintext(): void
    {
        $base = $this->baseCitizenData();
        $nik = '3218030101010099';

        $citizen = Citizen::create([
            ...$base,
            'nik' => $nik,
            'name' => 'Warga Uji',
            'date_of_birth' => '1990-01-01',
            'gender' => 'L',
            'address' => 'Desa Cibenda',
        ]);

        $this->assertSame($nik, $citizen->nik);
        $this->assertSame(hash('sha256', $nik), $citizen->nik_hash);

        $rawStoredNik = DB::table('citizens')->where('id', $citizen->id)->value('nik');
        $this->assertNotSame($nik, $rawStoredNik);
    }

    #[Test]
    public function new_enum_columns_are_cast_correctly(): void
    {
        $base = $this->baseCitizenData();

        $citizen = Citizen::create([
            ...$base,
            'nik' => '3218030101010005',
            'name' => 'Warga Pendatang',
            'date_of_birth' => '1990-01-01',
            'gender' => 'L',
            'address' => 'Desa Cibenda',
            'blood_type' => 'O',
            'residency_type' => 'pendatang',
        ]);

        $this->assertSame(BloodType::O, $citizen->blood_type);
        $this->assertSame(ResidencyType::PENDATANG, $citizen->residency_type);
    }
}
