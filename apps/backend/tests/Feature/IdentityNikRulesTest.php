<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\LetterType;
use App\Models\Rt;
use App\Models\Village;
use App\Support\LetterFormSchema;
use Database\Seeders\ApprovalFlowSeeder;
use Database\Seeders\LetterTypeSeeder;
use Database\Seeders\ServiceLetterTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Aturan NIK identitas di semua jenis surat bawaan: satu NIK satu orang,
 * jenis kelamin sesuai peran (bila warga desa), bukan pemohon, dan NIK
 * yang belum boleh terdaftar (pendatang, bayi baru lahir).
 */
class IdentityNikRulesTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private Citizen $applicant;

    private Citizen $wife;

    private Citizen $man;

    private Citizen $woman;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        $this->seed([ApprovalFlowSeeder::class, LetterTypeSeeder::class, ServiceLetterTypeSeeder::class]);
        $rt = Rt::factory()->create();
        $family = Family::factory()->create(['village_id' => $this->village->id]);
        $member = fn (array $attributes): Citizen => Citizen::factory()->create([
            'village_id' => $this->village->id, 'rt_id' => $rt->id, 'family_id' => $family->id, ...$attributes,
        ]);
        $this->applicant = $member(['nik' => '3207240101800001', 'gender' => 'L', 'family_role' => 'kepala_keluarga', 'date_of_birth' => '1980-01-01']);
        $this->wife = $member(['nik' => '3207244101820002', 'gender' => 'P', 'family_role' => 'istri', 'date_of_birth' => '1982-01-01']);
        // Warga desa di KK lain.
        $this->man = Citizen::factory()->create(['village_id' => $this->village->id, 'nik' => '3207240101700003', 'gender' => 'L', 'date_of_birth' => '1970-01-01']);
        $this->woman = Citizen::factory()->create(['village_id' => $this->village->id, 'nik' => '3207244101720004', 'gender' => 'P', 'date_of_birth' => '1972-01-01']);
    }

    public function test_village_letters_check_the_person_against_the_applicant_and_the_typed_gender(): void
    {
        // A07/A11: almarhum bukan pemohon. NIK warga desa (termasuk yang sudah
        // dinonaktifkan): identitas diambil dari data penduduk, tidak perlu diketik.
        $this->assertErrors('A07', ['nik_almarhum' => '3207240101800001'], ['nik_almarhum' => 'NIK ini milik Anda sendiri; isi NIK orang yang dimaksud.']);
        $this->woman->update(['is_active' => false]);
        foreach (['A07', 'A11'] as $code) {
            $errors = $this->validate($code, ['nik_almarhum' => '3207244101720004']);
            foreach (['nama_almarhum', 'tempat_lahir_almarhum', 'tanggal_lahir_almarhum', 'jenis_kelamin_almarhum', 'alamat_almarhum'] as $field) {
                $this->assertArrayNotHasKey("payload.{$field}", $errors, "{$code}: {$field} diambil dari NIK.");
            }
        }
        $this->assertArrayNotHasKey('payload.pekerjaan_almarhum', $this->validate('A11', ['nik_almarhum' => '3207244101720004']));
        // NIK di luar data desa atau kosong: identitas diketik.
        $this->assertErrors('A11', ['nik_almarhum' => '3201010101010101'], ['nama_almarhum', 'tanggal_lahir_almarhum', 'jenis_kelamin_almarhum', 'pekerjaan_almarhum']);
        $this->assertErrors('A07', [], ['nama_almarhum', 'alamat_almarhum']);

        // A08: anak yang baru lahir belum terdata, dan bukan pasangan.
        $this->assertErrors('A08', ['nik_anak' => '3207240101700003', 'jenis_kelamin_anak' => 'L'], ['nik_anak' => 'NIK ini sudah terdaftar sebagai warga desa.']);
        $this->assertErrors('A08', ['nik_pasangan' => '3201010101010101', 'nik_anak' => '3201010101010101'], ['nik_anak' => 'NIK ini sudah dipakai untuk NIK Pasangan; satu NIK hanya untuk satu orang.']);
    }

    public function test_service_forms_keep_one_nik_per_person_and_parents_by_gender(): void
    {
        // F02 SPTJM: suami laki-laki, istri perempuan, dan berbeda orang.
        $this->assertErrors('F02', ['status_kawin_belum_tercatat' => 'ya', 'nik_suami' => '3207244101720004', 'nik_istri' => '3207244101720004'], ['nik_suami', 'nik_istri']);

        // F04: pendatang belum warga desa, orang tuanya sesuai jenis kelamin dan bukan dirinya.
        $arrival = ['tempat_tinggal' => 'milik_sendiri', 'jenis_kelamin_pendatang' => 'L'];
        $this->assertErrors('F04', [...$arrival, 'nik_pendatang' => '3207240101700003'], ['nik_pendatang' => 'NIK ini sudah terdaftar sebagai warga desa.']);
        $this->assertErrors('F04', [...$arrival, 'nik_pendatang' => '3201010101010101', 'nik_ibu_pendatang' => '3207240101700003'], ['nik_ibu_pendatang' => 'NIK ini terdaftar atas warga laki-laki; isi NIK perempuan.']);
        $this->assertErrors('F04', [...$arrival, 'nik_pendatang' => '3201010101010101', 'nik_ayah_pendatang' => '3201010101010101'], ['nik_ayah_pendatang', 'nik_pendatang']);

        // F05: ayah diketik laki-laki; saksi dan penolong bukan ibu bayi.
        $this->assertErrors('F05', ['nik_ayah' => '3207244101720004'], ['nik_ayah' => 'NIK ini terdaftar atas warga perempuan; isi NIK laki-laki.']);
        $this->assertErrors('F05', ['ibu' => $this->wife->id, 'nik_saksi_1' => '3207244101820002'], ['nik_saksi_1' => 'Saksi tidak boleh orang yang sama dengan Ibu.']);
        $this->assertErrors('F05', ['ibu' => $this->wife->id, 'surat_lahir' => 'tidak', 'nik_penolong' => '3207244101820002'], ['nik_penolong']);

        // F07: pasangan sesuai perannya; satu NIK untuk satu orang tua (orang
        // tua ditanyakan di F-2.01: perkawinan selain Islam yang dicatatkan).
        $marriage = ['peristiwa' => 'perkawinan', 'peran_pemohon' => 'suami', 'agama_perkawinan' => 'kristen', 'status_kawin_belum_tercatat' => 'tidak', 'akta_capil_terbit' => 'tidak'];
        $this->assertErrors('F07', [...$marriage, 'nik_istri' => '3207240101700003'], ['nik_istri' => 'NIK ini terdaftar atas warga laki-laki; isi NIK perempuan.']);
        $this->assertErrors('F07', [...$marriage, 'nik_istri' => '3207244101720004', 'nik_ayah_suami' => '1231231231231231', 'nik_ayah_istri' => '1231231231231231'], ['nik_ayah_suami', 'nik_ayah_istri']);
        $this->assertErrors('F07', [...$marriage, 'nik_istri' => '3207244101720004', 'nik_ibu_istri' => '3207244101720004'], ['nik_ibu_istri']);
        $this->assertErrors('F07', [...$marriage, 'nik_ayah_suami' => '3207240101800001'], ['nik_ayah_suami' => 'NIK ini milik Anda sendiri; isi NIK orang yang dimaksud.']);

        // F08: ayah biologis laki-laki dan bukan pemohon.
        $this->assertErrors('F08', ['pemohon_ayah' => 'tidak', 'nik_ayah' => '3207244101720004'], ['nik_ayah' => 'NIK ini terdaftar atas warga perempuan; isi NIK laki-laki.']);
        $this->assertErrors('F08', ['pemohon_ayah' => 'tidak', 'nik_ayah' => '3207240101800001'], ['nik_ayah' => 'NIK ini milik Anda sendiri; isi NIK orang yang dimaksud.']);

        // F06: saksi bukan almarhum.
        $this->assertErrors('F06', ['almarhum' => $this->wife->id, 'nik_saksi_1' => '3207244101820002'], ['nik_saksi_1' => 'Saksi tidak boleh orang yang sama dengan Anggota Keluarga yang Meninggal.']);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<int|string, string>  $expected  nama isian, atau nama isian => pesan
     */
    private function assertErrors(string $code, array $payload, array $expected): void
    {
        $errors = $this->validate($code, $payload);

        foreach ($expected as $key => $value) {
            [$field, $message] = is_int($key) ? [$value, null] : [$key, $value];
            $this->assertArrayHasKey("payload.{$field}", $errors, "{$code}: {$field} seharusnya ditolak.");

            if ($message !== null) {
                $this->assertContains($message, $errors["payload.{$field}"], "{$code}: pesan {$field}.");
            }
        }
    }

    /**
     * Galat validasi isian (aturan LetterFormSchema) untuk pemohon uji.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, array<int, string>>
     */
    private function validate(string $code, array $payload): array
    {
        $type = LetterType::query()->where('village_id', $this->village->id)->where('code', $code)->firstOrFail();
        $schema = new LetterFormSchema($type, $this->applicant);
        $payload = $schema->withApplicantValues($payload);

        return Validator::make(['payload' => $payload], $schema->payloadRules($payload), [], $schema->attributeLabels())
            ->errors()
            ->toArray();
    }
}
