<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\User;
use App\Models\Village;
use App\Support\LetterValueFormatter;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Database\Seeders\ApprovalFlowSeeder;
use Database\Seeders\LetterTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Surat A01-A10 hasil seeder dirender sesuai template fisik kantor desa.
 */
class SeededLetterRenderingTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $rtApprover;

    private array $kades;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->travelTo(now()->setDate(2026, 10, 12)->setTime(9, 0));

        $this->village = Village::factory()->create([
            'name' => 'Desa Sukamaju',
            'address' => 'Jl. Raya Sukamaju No. 1',
            'phone' => '0265123456',
            'district' => 'Cijulang',
            'regency' => 'Pangandaran',
            'province' => 'Jawa Barat',
            'postal_code' => '46394',
            'email' => 'desa@sukamaju.test',
        ]);
        $this->seed([ApprovalFlowSeeder::class, LetterTypeSeeder::class]);

        ['rt' => $rt] = $this->makeArea($this->village);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'name' => 'Pelapor Hidup',
            'gender' => 'L',
            'residency_type' => 'lokal',
        ]);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
    }

    public function test_terbilang(): void
    {
        $this->assertSame('nol', LetterValueFormatter::terbilang(0));
        $this->assertSame('sebelas', LetterValueFormatter::terbilang(11));
        $this->assertSame('seratus lima belas', LetterValueFormatter::terbilang(115));
        $this->assertSame('seribu', LetterValueFormatter::terbilang(1000));
        $this->assertSame('dua juta lima ratus ribu', LetterValueFormatter::terbilang(2_500_000));
        $this->assertSame('satu miliar dua ratus juta seribu satu', LetterValueFormatter::terbilang(1_200_001_001));
    }

    public function test_burial_letter_identifies_the_deceased_not_the_applicant(): void
    {
        $html = $this->issue('A07', [
            'nama_almarhum' => 'Almarhum Fulan',
            'tempat_lahir_almarhum' => 'Ciamis',
            'tanggal_lahir_almarhum' => '1950-05-17',
            'nik_almarhum' => '3207011705500001',
            'jenis_kelamin_almarhum' => 'L',
            'alamat_almarhum' => 'Dusun Cibenda RT 001/RW 013',
            'tanggal_meninggal' => '2026-10-09',
            'tempat_meninggal' => 'Rumah',
            'sebab' => 'Sakit',
            'tanggal_pemakaman' => '2026-10-10',
            'tempat_pemakaman' => 'TPU Cibenda',
        ]);

        $this->assertStringContainsString('SURAT KETERANGAN PENGUBURAN', $html);
        $this->assertStringContainsString('Almarhum Fulan', $html);
        $this->assertStringContainsString('Ciamis, 17 Mei 1950', $html);
        $this->assertStringContainsString('Laki-laki', $html);
        $this->assertStringContainsString('Jumat, 9 Oktober 2026', $html);
        $this->assertStringContainsString('Sabtu, 10 Oktober 2026', $html);
        $this->assertStringContainsString('TPU Cibenda', $html);
        // Pemohon hanyalah pelapor dan tidak boleh tercetak sebagai yang meninggal.
        $this->assertStringNotContainsString('Pelapor Hidup', $html);
        $this->assertStringNotContainsString('________', $html);
    }

    public function test_income_letter_uses_classification_510_and_spells_out_the_amount(): void
    {
        $html = $this->issue('A03', [
            'jenis_usaha' => 'Perdagangan',
            'penghasilan_perbulan' => '2500000',
        ]);

        $this->assertStringContainsString('Nomor : 510/001/Des/X/2026', $html);
        $this->assertStringContainsString('Rp. 2.500.000,- (dua juta lima ratus ribu rupiah) setiap bulannya', $html);
        $this->assertStringContainsString('Sukamaju, 12 Oktober 2026', $html);
        // Kop surat berasal dari profil desa, bukan teks tetap.
        $this->assertStringContainsString('PEMERINTAH KABUPATEN PANGANDARAN', $html);
        $this->assertStringContainsString('KECAMATAN CIJULANG', $html);
        $this->assertStringContainsString('DESA SUKAMAJU', $html);
        $this->assertStringContainsString('Jl. Raya Sukamaju No. 1 Tlp. 0265123456', $html);
        $this->assertStringContainsString('email : desa@sukamaju.test', $html);
        $this->assertStringContainsString('Kode Pos 46394', $html);
        $this->assertStringNotContainsString('CIBENDA', mb_strtoupper($html));
        $this->assertStringContainsString(e($this->kades['citizen']->name), $html);
        $this->assertStringNotContainsString('________', $html);
    }

    public function test_domicile_letter_wording_depends_on_residency_status(): void
    {
        $payload = ['alamat_domisili' => 'Dusun Cibenda RT 001/RW 013'];

        $local = $this->issue('A04', $payload);
        $this->assertStringContainsString('benar-benar warga masyarakat Desa kami, dan menurut keterangan RT/RW', $local);
        $this->assertStringContainsString('berdomisili di alamat Dusun Cibenda RT 001/RW 013 Desa Sukamaju Kecamatan Cijulang Kabupaten Pangandaran Jawa Barat.', $local);

        $this->applicant['citizen']->update(['residency_type' => 'pendatang']);
        $newcomer = $this->issue('A04', $payload);
        $this->assertStringContainsString('bukan warga masyarakat Desa kami, namun menurut keterangan RT/RW', $newcomer);

        // Dua surat berkode klasifikasi sama mendapat nomor berurutan.
        $this->assertStringContainsString('Nomor : 470/001/Des/X/2026', $local);
        $this->assertStringContainsString('Nomor : 470/002/Des/X/2026', $newcomer);
    }

    public function test_name_difference_letter_keeps_one_name_per_line(): void
    {
        $html = $this->issue('A06', [
            'nama_berbeda' => "SITI AMINAH (KK an. Budi)\nSITI AMINA <b>(KK an. Ani)</b>",
            'sumber_dokumen' => 'Akta Kelahiran',
            'nomor_dokumen' => '123/AK/1990',
            'nama_benar' => 'SITI AMINAH',
        ]);

        $this->assertStringContainsString("SITI AMINAH (KK an. Budi)<br>\nSITI AMINA &lt;b&gt;(KK an. Ani)&lt;/b&gt;", $html);
        $this->assertStringContainsString('tercatat dalam Akta Kelahiran Nomor : 123/AK/1990 atas nama <strong>SITI AMINAH</strong>', $html);
    }

    public function test_birth_letter_lists_both_parents_and_child_then_kasi_adds_the_child(): void
    {
        $kasi = $this->makeOfficialUser('kasi_pelayanan', $this->village);
        $payload = [
            'nama_pasangan' => 'Ibu Contoh',
            'tempat_lahir_pasangan' => 'Pangandaran',
            'tanggal_lahir_pasangan' => '1995-02-03',
            'nik_pasangan' => '3207014302950001',
            'jenis_kelamin_pasangan' => 'P',
            'alamat_pasangan' => 'Dusun Cibenda RT 001/RW 013',
            'nama_anak' => 'Anak Contoh',
            'tempat_lahir_anak' => 'Pangandaran',
            'tanggal_lahir_anak' => '2026-10-01',
            'jenis_kelamin_anak' => 'P',
            'alamat_anak' => 'Dusun Cibenda RT 001/RW 013',
        ];

        $html = $this->issue('A08', $payload, $letterId);

        $this->assertStringContainsString('Pelapor Hidup', $html);
        $this->assertStringContainsString('Ibu Contoh', $html);
        $this->assertStringContainsString('pasangan suami istri yang memiliki anak Perempuan', $html);
        $this->assertStringContainsString('Anak Contoh', $html);
        $this->assertStringContainsString('Pangandaran, 1 Oktober 2026', $html);

        $this->actingAs($kasi['user'])
            ->getJson("/api/letters/{$letterId}/fulfillment")
            ->assertOk()
            ->assertJsonPath('data.action', 'create_citizen')
            ->assertJsonPath('data.fields.1.proposed', 'Anak Contoh');

        $this->actingAs($kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => ['nik' => '3207014110260001']])
            ->assertOk();

        $child = Citizen::query()->where('nik_hash', hash('sha256', '3207014110260001'))->firstOrFail();
        $this->assertSame('Anak Contoh', $child->name);
        $this->assertSame('P', $child->gender);
        $this->assertSame('2026-10-01', $child->date_of_birth->format('Y-m-d'));
        $this->assertSame($this->applicant['citizen']->rt_id, $child->rt_id);
    }

    public function test_required_fields_of_seeded_types_are_enforced_on_submission(): void
    {
        $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $this->letterType('A07')->id,
                'purpose' => 'Pengurusan akta kematian',
                'payload' => ['nama_almarhum' => 'Almarhum Fulan', 'jenis_kelamin_almarhum' => 'X'],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'payload.tanggal_meninggal',
                'payload.tempat_pemakaman',
                'payload.jenis_kelamin_almarhum',
            ])
            ->assertJsonMissingValidationErrors(['payload.sebab', 'payload.nik_almarhum']);
    }

    public function test_burial_letter_lets_kasi_deactivate_the_deceased_citizen(): void
    {
        $kasi = $this->makeOfficialUser('kasi_pelayanan', $this->village);
        $deceased = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'nik' => '3207011705500001',
            'name' => 'Almarhum Fulan',
            'is_active' => true,
        ]);
        $deceasedAccount = User::factory()->create([
            'village_id' => $this->village->id,
            'citizen_id' => $deceased->id,
            'role' => 'warga',
            'is_active' => true,
        ]);
        $payload = [
            'nama_almarhum' => 'Almarhum Fulan',
            'tempat_lahir_almarhum' => 'Ciamis',
            'tanggal_lahir_almarhum' => '1950-05-17',
            'jenis_kelamin_almarhum' => 'L',
            'alamat_almarhum' => 'Dusun Cibenda RT 001/RW 013',
            'tanggal_meninggal' => '2026-10-09',
            'tempat_meninggal' => 'Rumah',
            'tanggal_pemakaman' => '2026-10-10',
            'tempat_pemakaman' => 'TPU Cibenda',
        ];

        // NIK almarhum tidak diisi pemohon: Kasi wajib melengkapinya.
        $this->issue('A07', $payload, $withoutNik);
        $this->actingAs($kasi['user'])
            ->getJson("/api/letters/{$withoutNik}/fulfillment")
            ->assertOk()
            ->assertJsonPath('data.action', 'update_citizen')
            ->assertJsonPath('data.subject.found', false)
            ->assertJsonPath('data.fields.0.column', 'is_active')
            ->assertJsonPath('data.fields.0.fixed', true)
            ->assertJsonPath('data.fields.0.display', 'Dinonaktifkan (meninggal dunia)');
        $this->actingAs($kasi['user'])
            ->postJson("/api/letters/{$withoutNik}/fulfillment")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['subject_nik']);
        $this->actingAs($kasi['user'])
            ->postJson("/api/letters/{$withoutNik}/fulfillment", ['subject_nik' => '3299999999999999'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['subject_nik']);
        // Nilai tetap dari jenis surat tidak dapat diganti.
        $this->actingAs($kasi['user'])
            ->postJson("/api/letters/{$withoutNik}/fulfillment", [
                'subject_nik' => '3207011705500001',
                'values' => ['is_active' => true],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['values']);
        $this->assertTrue($deceased->fresh()->is_active);
        $this->assertTrue($deceasedAccount->fresh()->is_active);
        // Pemohon (pelapor) tidak ikut berubah.
        $this->assertTrue($this->applicant['citizen']->fresh()->is_active);

        $this->actingAs($kasi['user'])
            ->postJson("/api/letters/{$withoutNik}/fulfillment", ['subject_nik' => '3207011705500001'])
            ->assertOk();

        // Akun login dan data warga almarhum dinonaktifkan bersama.
        $this->assertFalse($deceasedAccount->fresh()->is_active);
        $this->assertFalse($deceased->fresh()->is_active);
        $this->assertTrue($this->applicant['citizen']->fresh()->is_active);
        $this->assertTrue($this->applicant['user']->fresh()->is_active);
        $letter = Letter::query()->findOrFail($withoutNik);
        $this->assertSame($deceased->id, $letter->fulfillment['citizen_id']);
        $this->assertSame(['old' => true, 'new' => false], $letter->fulfillment['changes']['is_active']);
        $this->assertSame(['old' => true, 'new' => false], $letter->fulfillment['changes']['account_is_active']);

        // NIK diisi pemohon dan cocok: subjek langsung ditemukan.
        $other = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'nik' => '3207011705500002',
            'name' => 'Almarhumah Fulanah',
        ]);
        $this->issue('A07', [...$payload, 'nik_almarhum' => '3207011705500002'], $withNik);
        $this->actingAs($kasi['user'])
            ->getJson("/api/letters/{$withNik}/fulfillment")
            ->assertJsonPath('data.subject.found', true)
            ->assertJsonPath('data.subject.name', 'Almarhumah Fulanah');
        $this->actingAs($kasi['user'])
            ->postJson("/api/letters/{$withNik}/fulfillment")
            ->assertOk();
        $this->assertFalse($other->fresh()->is_active);
    }

    private function letterType(string $code): LetterType
    {
        return LetterType::query()
            ->where('village_id', $this->village->id)
            ->where('code', $code)
            ->firstOrFail();
    }

    /**
     * Mengajukan surat, menyetujuinya sampai final, lalu mengembalikan
     * HTML yang dikirim ke PDF.
     */
    private function issue(string $code, array $payload, ?string &$letterId = null): string
    {
        $letterId = $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $this->letterType($code)->id,
                'purpose' => 'Keperluan administrasi',
                'payload' => $payload,
            ])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($this->rtApprover['user'])
            ->patchJson("/api/rt/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();
        $this->actingAs($this->kades['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();

        $rendered = null;
        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('download')->once()->andReturn(new Response('', 200));
        Pdf::shouldReceive('loadView')
            ->once()
            ->with('pdf.templates.wet', Mockery::on(function (array $data) use (&$rendered): bool {
                $rendered = $data['template'];

                return true;
            }))
            ->andReturn($pdf);

        $this->actingAs($this->applicant['user'])
            ->get('/api/letters/'.Letter::query()->findOrFail($letterId)->id.'/download')
            ->assertOk();

        return $rendered;
    }
}
