<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Letter;
use App\Models\LetterSignature;
use App\Models\LetterType;
use App\Models\Rt;
use App\Models\Village;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Database\Seeders\ApprovalFlowSeeder;
use Database\Seeders\ServiceLetterTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * F09 Perubahan Susunan KK: F-1.02 + F-1.01 susunan KK hasil (+ surat
 * pernyataan numpang KK). Terapkan membuat KK baru, mengganti kepala
 * keluarga, atau memindahkan anggota ke KK lain di desa.
 */
class FamilyRestructureServiceTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private Rt $rt;

    private Rt $newArea;

    private Family $family;

    private Citizen $father;

    private Citizen $mother;

    private array $applicant;

    private Citizen $sister;

    private array $spouse;

    private array $host;

    private Family $hostFamily;

    private array $rtApprover;

    private array $kades;

    private array $kasi;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');
        $this->travelTo(now()->setDate(2026, 10, 12)->setTime(9, 0));

        $this->village = Village::factory()->create(['name' => 'Desa Cibenda', 'district' => 'Parigi', 'regency' => 'Pangandaran']);
        $this->seed([ApprovalFlowSeeder::class, ServiceLetterTypeSeeder::class]);
        $this->rt = $this->makeNamedArea($this->village, 'Budiasih', '19', '2');
        $this->newArea = $this->makeNamedArea($this->village, 'Cikawung', '3', '1');

        // KK Ujang: Ujang (kepala), Iis (istri), Dadan (anak, pemohon), Asti (anak).
        $this->family = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218011304150001', 'rt_id' => $this->rt->id]);
        $member = fn (array $attributes): array => ['village_id' => $this->village->id, 'rt_id' => $this->rt->id, 'family_id' => $this->family->id, ...$attributes];
        $this->father = Citizen::factory()->create($member(['name' => 'Ujang Sutisna', 'family_role' => 'kepala_keluarga', 'gender' => 'L', 'date_of_birth' => '1960-01-01']));
        $this->mother = Citizen::factory()->create($member(['name' => 'Iis Aisah', 'family_role' => 'istri', 'gender' => 'P', 'date_of_birth' => '1965-01-01']));
        $this->applicant = $this->makeCitizenAccount($this->village, $this->rt, 'warga', $member([
            'name' => 'Dadan Ramdani', 'nik' => '3207240101950001', 'family_role' => 'anak', 'gender' => 'L', 'date_of_birth' => '1995-01-01',
        ]));
        $this->sister = Citizen::factory()->create($member(['name' => 'Asti Nurfadilah', 'family_role' => 'anak', 'gender' => 'P', 'date_of_birth' => '2000-01-01']));

        // Euis di KK orang tuanya (punya akun).
        $spouseFamily = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218011304150002']);
        $this->spouse = $this->makeCitizenAccount($this->village, $this->rt, 'warga', [
            'name' => 'Euis Komariah', 'nik' => '3207246202970002', 'family_id' => $spouseFamily->id, 'family_role' => 'anak', 'gender' => 'P', 'date_of_birth' => '1997-02-22',
        ]);

        // KK tujuan numpang: Ahmad (kepala, punya akun).
        $this->hostFamily = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218011304150003', 'rt_id' => $this->newArea->id, 'family_address' => 'Dusun Cikawung RT 001 RW 003']);
        $this->host = $this->makeCitizenAccount($this->village, $this->newArea, 'warga', [
            'name' => 'Ahmad Fauzi', 'nik' => '3207240505700003', 'family_id' => $this->hostFamily->id, 'family_role' => 'kepala_keluarga', 'gender' => 'L', 'date_of_birth' => '1970-05-05',
        ]);

        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $this->rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
        $this->kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village);
    }

    public function test_new_family_with_a_spouse_from_another_family(): void
    {
        $payload = [
            'jenis_perubahan' => 'kk_baru',
            'alasan_kk_baru' => 'keluarga_baru',
            'susunan_baru' => [['anggota' => $this->applicant['citizen']->id, 'shdk' => 'kepala_keluarga']],
            'nik_pasangan' => '3207246202970002',
            'shdk_pasangan' => 'istri',
            'alamat_kk_baru' => $this->newArea->id,
            'no_buku_nikah_kk' => '0789/12/X/2026',
            'tanggal_perkawinan_kk' => '2026-10-03',
            'telepon_keluarga' => '081234567890',
            // Data tambahan anggota untuk F-1.01, disimpan saat Terapkan.
            'data_tambahan' => [['anggota' => $this->applicant['citizen']->id, 'gelar_belakang' => 'S.Kom.', 'kelainan' => 'ada', 'cacat' => 'Tuna rungu']],
        ];

        // Buku nikah wajib untuk keluarga baru, dan tidak sebelum pasangan lahir.
        $this->submit([...$payload, 'no_buku_nikah_kk' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.no_buku_nikah_kk');
        $this->submit([...$payload, 'tanggal_perkawinan_kk' => '1990-01-01'])
            ->assertJsonValidationErrors('payload.tanggal_perkawinan_kk');

        // Tepat satu kepala keluarga, dan pasangan bukan anggota KK sendiri.
        $this->submit([...$payload, 'shdk_pasangan' => 'kepala_keluarga'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.susunan_baru' => 'Pilih tepat satu Kepala Keluarga untuk KK baru.']);
        $this->submit([...$payload, 'nik_pasangan' => '3207240101950001'])
            ->assertJsonValidationErrors('payload.nik_pasangan');
        // Suami laki-laki, Istri perempuan (anggota KK dan pasangan ber-NIK).
        $this->submit([...$payload, 'susunan_baru' => [
            ['anggota' => $this->applicant['citizen']->id, 'shdk' => 'istri'],
            ['anggota' => $this->sister->id, 'shdk' => 'kepala_keluarga'],
        ], 'shdk_pasangan' => 'anak'])
            ->assertJsonValidationErrors(['payload.susunan_baru.0.shdk' => 'Istri harus perempuan.']);
        $this->submit([...$payload, 'shdk_pasangan' => 'suami'])
            ->assertJsonValidationErrors(['payload.shdk_pasangan' => 'Suami harus laki-laki.']);

        $this->applicant['citizen']->update(['marital_status' => 'belum_kawin']);
        $this->spouse['citizen']->update(['marital_status' => 'belum_kawin']);
        $letterId = $this->submit($payload)->assertCreated()->json('data.id');

        // Pasangan berakun diminta persetujuan sebelum surat diproses RT.
        $request = LetterSignature::query()->where('letter_id', $letterId)->where('slot_key', 'nik_pasangan')->firstOrFail();
        $this->assertSame(LetterSignature::STATUS_PENDING, $request->status);
        $this->actingAs($this->spouse['user'])
            ->postJson("/api/signature-requests/{$request->id}/accept", ['password' => 'Password123'])
            ->assertOk();
        $this->approve($letterId);

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_01']);
        // F-1.02: KK baru karena membentuk keluarga baru, lampiran KK lama dan buku nikah.
        $this->assertSame(4, preg_match_all('/<b>V<\/b>|xf-circle>V</', $this->render($letterId, null)));
        // F-1.01: Dadan kepala keluarga, Euis istri, di alamat KK baru.
        $biodata = $this->render($letterId, 'f1_01', landscape: true);
        $this->assertMatchesRegularExpression('/>1<\/td><td[^>]*>Dadan Ramdani</', $biodata);
        $this->assertStringContainsString('>Euis Komariah<', $biodata);
        $this->assertStringContainsString('Dusun Cikawung RT 001 RW 003', $biodata);
        $this->assertStringNotContainsString('Ujang Sutisna', $biodata);
        // Kepala keluarga dan istri: Kawin dengan buku nikah; data tambahan dan telepon.
        $this->assertSame(2, substr_count($biodata, '>0789/12/X/2026</td>'));
        $this->assertSame(2, substr_count($biodata, '>3 Oktober 2026</td>'));
        $this->assertStringContainsString('>S.Kom.</td>', $biodata);
        $this->assertStringContainsString('>Tuna rungu</td>', $biodata);
        $this->assertMatchesRegularExpression('/>0<\/td><td[^>]*>8<\/td><td[^>]*>1<\/td><td[^>]*>2/', $biodata);

        $this->acceptResult($letterId);
        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letterId}/fulfillment")
            ->assertJsonPath('data.action', 'restructure_family')
            ->assertJsonPath('data.restructure.lines.1', 'Dadan Ramdani: Kepala Keluarga')
            ->assertJsonPath('data.restructure.lines.2', 'Euis Komariah (dari KK lain): Istri')
            ->assertJsonPath('data.restructure.lines.3', 'Status perkawinan kepala keluarga dan suami/istri menjadi Kawin (bila belum).');
        // Pop up konfirmasi ikut menampilkan perubahan status kawin.
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment/preview", ['values' => ['no_kk' => '3218011304159999']])
            ->assertOk()
            ->assertSee('Belum Kawin')
            ->assertSee('Kawin');
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment/preview", ['values' => []])
            ->assertJsonValidationErrors('values.no_kk');
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => ['no_kk' => '3218011304159999']])
            ->assertOk();

        $newFamily = Family::query()->where('no_kk_hash', hash('sha256', '3218011304159999'))->firstOrFail();
        $dadan = $this->applicant['citizen']->fresh();
        $euis = $this->spouse['citizen']->fresh();
        $this->assertSame($newFamily->id, $dadan->family_id);
        $this->assertSame('kepala_keluarga', $dadan->family_role->value);
        $this->assertSame($this->newArea->id, $dadan->rt_id);
        $this->assertSame($newFamily->id, $euis->family_id);
        $this->assertSame('istri', $euis->family_role->value);
        $this->assertSame('kawin', $dadan->marital_status);
        $this->assertSame('kawin', $euis->marital_status);
        $this->assertSame('0789/12/X/2026', $euis->marriage_certificate_number);
        $this->assertSame('2026-10-03', $dadan->marriage_date->toDateString());
        $this->assertSame('S.Kom.', $dadan->title_back);
        $this->assertTrue($dadan->has_disorder);
        $this->assertSame('Tuna rungu', $dadan->disability);
        $this->assertNull($euis->title_back);
        // KK lama tetap berkepala Ujang.
        $this->assertSame('kepala_keluarga', $this->father->fresh()->family_role->value);
        $this->assertSame($this->family->id, $this->father->fresh()->family_id);
    }

    public function test_split_family_with_the_head_leaving_sets_a_new_head_for_the_old_family(): void
    {
        $payload = [
            'jenis_perubahan' => 'kk_baru',
            'alasan_kk_baru' => 'pisah',
            'susunan_baru' => [
                ['anggota' => $this->father->id, 'shdk' => 'kepala_keluarga'],
                ['anggota' => $this->mother->id, 'shdk' => 'istri'],
            ],
            'alamat_kk_baru' => $this->newArea->id,
        ];

        $this->submit($payload)->assertUnprocessable()->assertJsonValidationErrors('payload.kepala_baru');
        $this->submit([...$payload, 'susunan_baru' => [...$payload['susunan_baru'], ['anggota' => $this->mother->id, 'shdk' => 'anak']]])
            ->assertJsonValidationErrors(['payload.susunan_baru' => 'Anggota keluarga yang sama dipilih lebih dari sekali.']);

        $this->father->update(['marital_status' => 'cerai_mati']);
        $letterId = $this->submit([...$payload, 'kepala_baru' => $this->applicant['citizen']->id])->assertCreated()->json('data.id');
        $this->approve($letterId);
        $this->acceptResult($letterId);
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => ['no_kk' => '3218011304159998']])
            ->assertOk();

        $this->assertNotSame($this->family->id, $this->father->fresh()->family_id);
        $this->assertSame($this->father->fresh()->family_id, $this->mother->fresh()->family_id);
        $this->assertSame('kepala_keluarga', $this->applicant['citizen']->fresh()->family_role->value);
        $this->assertSame($this->family->id, $this->sister->fresh()->family_id);
        // Pisah KK tidak mengubah status kawin.
        $this->assertSame('cerai_mati', $this->father->fresh()->marital_status);
    }

    public function test_change_of_head_within_the_family(): void
    {
        $this->submit([
            'jenis_perubahan' => 'ganti_kepala',
            'kepala_pengganti' => $this->applicant['citizen']->id,
            'shdk_kepala_lama' => 'istri',
        ])->assertJsonValidationErrors(['payload.shdk_kepala_lama' => 'Istri harus perempuan.']);

        $letterId = $this->submit([
            'jenis_perubahan' => 'ganti_kepala',
            'kepala_pengganti' => $this->applicant['citizen']->id,
            'shdk_kepala_lama' => 'orang_tua',
        ])->assertCreated()->json('data.id');
        $this->approve($letterId);

        // F-1.02: KK baru karena penggantian kepala keluarga, cetak ulang KK.
        $registration = $this->render($letterId, null);
        $this->assertStringContainsString('Penggantian Kepala Keluarga <b>V</b>', $registration);
        $biodata = $this->render($letterId, 'f1_01', landscape: true);
        $this->assertMatchesRegularExpression('/>1<\/td><td[^>]*>Dadan Ramdani</', $biodata);
        $this->assertStringContainsString('Orang Tua', $biodata);

        $this->acceptResult($letterId);
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment/preview", ['values' => []])
            ->assertOk()
            ->assertJsonPath('data.0.changes.0.new', 'Orang Tua')
            ->assertJsonPath('data.1.changes.0.new', 'Kepala Keluarga');
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => []])
            ->assertOk();

        $this->assertSame('orang_tua', $this->father->fresh()->family_role->value);
        $this->assertSame('kepala_keluarga', $this->applicant['citizen']->fresh()->family_role->value);
    }

    public function test_member_joins_another_family_with_the_host_head_consent(): void
    {
        $payload = [
            'jenis_perubahan' => 'numpang',
            'anggota_numpang' => [['anggota' => $this->sister->id, 'shdk' => 'menantu']],
        ];

        $this->submit([...$payload, 'no_kk_tujuan' => '3218011304150001'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.no_kk_tujuan' => 'No. KK ini adalah KK Anda sendiri.']);
        $this->submit([...$payload, 'no_kk_tujuan' => '3218011304150099'])
            ->assertJsonValidationErrors(['payload.no_kk_tujuan' => 'No. KK ini tidak terdaftar di desa.']);
        $this->submit([...$payload, 'anggota_numpang' => [['anggota' => $this->sister->id, 'shdk' => 'suami']], 'no_kk_tujuan' => '3218011304150003'])
            ->assertJsonValidationErrors(['payload.anggota_numpang.0.shdk' => 'Suami harus laki-laki.']);

        $letterId = $this->submit([...$payload, 'no_kk_tujuan' => '3218011304150003'])->assertCreated()->json('data.id');
        $stored = Letter::query()->findOrFail($letterId)->payload;
        $this->assertSame('3207240505700003', $stored['nik_kepala_tujuan']);
        $this->assertSame('Ahmad Fauzi', $stored['nama_kepala_tujuan']);

        // Kepala KK tujuan menyetujui lewat akunnya.
        $request = LetterSignature::query()->where('letter_id', $letterId)->where('slot_key', 'nik_kepala_tujuan')->firstOrFail();
        $this->actingAs($this->host['user'])
            ->postJson("/api/signature-requests/{$request->id}/accept", ['password' => 'Password123'])
            ->assertOk();
        $this->approve($letterId);

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_01', 'numpang_kk']);
        $statement = $this->render($letterId, 'numpang_kk');
        $this->assertStringContainsString('TIDAK KEBERATAN NUMPANG KK', $statement);
        $this->assertStringContainsString('Asti Nurfadilah', $statement);
        $this->assertStringContainsString('Menantu', $statement);
        $this->assertStringContainsString('( Ahmad Fauzi )', $statement);
        // F-1.01 KK tujuan: Ahmad kepala keluarga, Asti menantu.
        $biodata = $this->render($letterId, 'f1_01', landscape: true);
        $this->assertMatchesRegularExpression('/>1<\/td><td[^>]*>Ahmad Fauzi</', $biodata);
        $this->assertStringContainsString('>Asti Nurfadilah<', $biodata);

        $this->acceptResult($letterId);
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => []])
            ->assertOk();

        $asti = $this->sister->fresh();
        $this->assertSame($this->hostFamily->id, $asti->family_id);
        $this->assertSame('menantu', $asti->family_role->value);
        $this->assertSame($this->newArea->id, $asti->rt_id);
    }

    private function submit(array $payload)
    {
        return $this->actingAs($this->applicant['user'])->postJson('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F09')->value('id'),
            'payload' => $payload,
        ]);
    }

    private function approve(string $letterId): void
    {
        $this->actingAs($this->rtApprover['user'])
            ->patchJson("/api/rt/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();
        $this->actingAs($this->kades['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();
    }

    private function acceptResult(string $letterId): void
    {
        $resultId = $this->actingAs($this->applicant['user'])
            ->post("/api/letters/{$letterId}/results", [
                'files' => [UploadedFile::fake()->create('kk-baru.pdf', 100, 'application/pdf')],
            ], ['Accept' => 'application/json'])
            ->json('data.id');
        $this->actingAs($this->kasi['user'])
            ->patchJson("/api/letters/{$letterId}/results/{$resultId}", ['decision' => 'accepted'])
            ->assertOk();
    }

    private function render(string $letterId, ?string $document, bool $landscape = false): string
    {
        $rendered = null;
        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('download')->once()->andReturn(new Response('', 200));

        if ($landscape) {
            $pdf->shouldReceive('setPaper')->once()->with('a4', 'landscape')->andReturnSelf();
        }
        Pdf::shouldReceive('loadView')
            ->once()
            ->with('pdf.templates.digital', Mockery::on(function (array $data) use (&$rendered): bool {
                $rendered = $data['template'];

                return true;
            }))
            ->andReturn($pdf);

        $query = $document === null ? '' : "&document={$document}";
        $this->actingAs($this->applicant['user'])
            ->get("/api/letters/{$letterId}/download?template=digital{$query}")
            ->assertOk();

        return (string) $rendered;
    }
}
