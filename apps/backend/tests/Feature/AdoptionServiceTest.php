<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\LetterSignature;
use App\Models\LetterType;
use App\Models\Rt;
use App\Models\Village;
use App\Notifications\FamilyMemberMovedNotification;
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
 * F10 Pelaporan Pengangkatan Anak: F-2.01 bagian pengangkatan anak + F-1.02
 * + F-1.01. Tanpa persetujuan KK asal (dasarnya penetapan pengadilan);
 * Terapkan memindahkan anak warga desa ke KK orang tua angkat atau
 * menambahkannya sebagai warga baru.
 */
class AdoptionServiceTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private const JSON = ['Accept' => 'application/json'];

    private Village $village;

    private Rt $rt;

    private Family $family;

    private array $applicant;

    private Citizen $wife;

    private array $originHead;

    private Family $originFamily;

    private Citizen $child;

    private array $rtApprover;

    private array $kades;

    private array $kasi;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');
        $this->travelTo(now()->setDate(2026, 10, 12)->setTime(9, 0));

        $this->village = Village::factory()->create(['name' => 'Desa Cibenda', 'district' => 'Parigi', 'regency' => 'Pangandaran', 'code' => '3218032001']);
        $this->seed([ApprovalFlowSeeder::class, ServiceLetterTypeSeeder::class]);
        $this->rt = $this->makeNamedArea($this->village, 'Budiasih', '19', '2');

        // KK orang tua angkat: Asep (kepala, pemohon) dan Neneng (istri).
        $this->family = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218011304150001', 'rt_id' => $this->rt->id]);
        $this->applicant = $this->makeCitizenAccount($this->village, $this->rt, 'warga', [
            'name' => 'Asep Saepudin', 'nik' => '3207240101800001', 'family_id' => $this->family->id, 'family_role' => 'kepala_keluarga',
            'gender' => 'L', 'date_of_birth' => '1980-01-01', 'address' => 'Dusun Budiasih RT 002 RW 019',
        ]);
        $this->wife = Citizen::factory()->create([
            'village_id' => $this->village->id, 'rt_id' => $this->rt->id, 'family_id' => $this->family->id, 'nik' => '3207244101820002',
            'name' => 'Neneng Hasanah', 'family_role' => 'istri', 'gender' => 'P', 'date_of_birth' => '1982-01-01',
        ]);

        // Keponakan di KK kakaknya (kepala KK asal punya akun).
        $this->originFamily = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218011304150009', 'rt_id' => $this->rt->id]);
        $this->originHead = $this->makeCitizenAccount($this->village, $this->rt, 'warga', [
            'name' => 'Dedi Kurnia', 'nik' => '3207240101750009', 'family_id' => $this->originFamily->id, 'family_role' => 'kepala_keluarga',
            'gender' => 'L', 'date_of_birth' => '1975-01-01',
        ]);
        $mother = Citizen::factory()->create([
            'village_id' => $this->village->id, 'rt_id' => $this->rt->id, 'family_id' => $this->originFamily->id, 'nik' => '3207244101780008',
            'name' => 'Rohaeti', 'family_role' => 'istri', 'gender' => 'P', 'date_of_birth' => '1978-01-01',
        ]);
        $this->child = Citizen::factory()->create([
            'village_id' => $this->village->id, 'rt_id' => $this->rt->id, 'family_id' => $this->originFamily->id, 'nik' => '3207245505150007',
            'name' => 'Rina Kurnia', 'family_role' => 'anak', 'gender' => 'P', 'date_of_birth' => '2015-05-15', 'place_of_birth' => 'Ciamis',
            'father_id' => $this->originHead['citizen']->id, 'mother_id' => $mother->id,
        ]);

        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $this->rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
        $this->kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village);
    }

    public function test_child_from_another_village_family_is_filled_from_the_population_data_and_moved(): void
    {
        $payload = [...$this->decision(), 'nik_anak' => '3207245505150007', 'nik_ibu_angkat' => '3207244101820002'];

        // Bukan pemohon sendiri, dan penetapan tidak sebelum anak lahir.
        $this->submit([...$payload, 'nik_anak' => '3207240101800001'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.nik_anak' => 'Anak angkat tidak boleh pemohon sendiri.']);
        $this->submit([...$payload, 'tanggal_penetapan' => '2010-01-01'])
            ->assertJsonValidationErrors('payload.tanggal_penetapan');

        $letterId = $this->submit($payload)->assertCreated()->json('data.id');
        // Tanpa persetujuan kepala KK asal: hanya saksi yang dicatat.
        $this->assertSame(['nik_saksi_1', 'nik_saksi_2'], LetterSignature::query()->where('letter_id', $letterId)->orderBy('slot_key')->pluck('slot_key')->all());
        $this->approve($letterId);

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_02', 'f1_01'])
            ->assertJsonPath('data.payload.nama_anak', 'Rina Kurnia')
            ->assertJsonPath('data.payload.tanggal_lahir_anak', '2015-05-15')
            ->assertJsonPath('data.payload.nama_ayah_kandung', 'Dedi Kurnia')
            ->assertJsonPath('data.payload.nik_ayah_angkat', '3207240101800001')
            ->assertJsonPath('data.payload.nama_ibu_angkat', 'Neneng Hasanah');

        // F-2.01: jenis Pengangkatan Anak dan bagiannya terisi.
        $report = $this->render($letterId, null);
        $this->assertSame(1, substr_count($report, '>X</td>'));
        foreach (['RINA', '3207245505150007', 'ROHAETI', 'DEDI', 'ASEP', 'NENENG', '123/PDT.P', 'PENGADILAN', '32180301'] as $value) {
            $this->assertMatchesRegularExpression($this->boxes($value), $report);
        }

        // F-1.01: susunan KK orang tua angkat ditambah anak angkat.
        $biodata = $this->render($letterId, 'f1_01', landscape: true);
        $this->assertStringContainsString('>Rina Kurnia<', $biodata);
        $this->assertStringContainsString('>Neneng Hasanah<', $biodata);
        $this->assertStringContainsString('>3<', $biodata);

        // F-1.02: perubahan KK karena peristiwa penting; lampiran KK lama dan
        // bukti peristiwa penting (penetapan pengadilan).
        $registration = $this->render($letterId, 'f1_02');
        $this->assertStringContainsString('Peristiwa Penting <b>V</b>', $registration);
        $this->assertSame(2, preg_match_all('/xf-circle>V</', $registration));

        $this->acceptResult($letterId);
        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letterId}/fulfillment")
            ->assertJsonPath('data.action', 'adopt_child')
            ->assertJsonPath('data.fields', [])
            ->assertJsonPath('data.restructure.lines.0', 'Rina Kurnia (dari No. KK ************0009) masuk ke KK pemohon sebagai Anak.');
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment/preview", ['values' => []])
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Rina Kurnia');
        // Pratinjau tidak memberi tahu siapa pun.
        Notification::assertNotSentTo($this->originHead['user'], FamilyMemberMovedNotification::class);

        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => []])
            ->assertOk();

        $child = $this->child->fresh();
        $this->assertSame($this->family->id, $child->family_id);
        $this->assertSame('anak', $child->family_role->value);
        $this->assertSame('Dusun Budiasih RT 002 RW 019', $child->address);
        // Orang tua kandung tetap.
        $this->assertSame($this->originHead['citizen']->id, $child->father_id);
        Notification::assertSentTo($this->originHead['user'], FamilyMemberMovedNotification::class);
    }

    public function test_child_without_a_nik_is_typed_and_added_as_a_new_citizen(): void
    {
        $payload = $this->decision();

        $this->submit($payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.nama_anak', 'payload.jenis_kelamin_anak', 'payload.tempat_lahir_anak', 'payload.tanggal_lahir_anak']);

        $letterId = $this->submit([
            ...$payload,
            'nama_anak' => 'Bayu Pratama',
            'jenis_kelamin_anak' => 'L',
            'tempat_lahir_anak' => 'Garut',
            'tanggal_lahir_anak' => '2020-02-02',
            'shdk_anak' => 'famili_lain',
        ])->assertCreated()->json('data.id');
        $this->approve($letterId);

        $biodata = $this->render($letterId, 'f1_01', landscape: true);
        $this->assertStringContainsString('>Bayu Pratama<', $biodata);
        $this->assertStringContainsString('2 Februari 2020', $biodata);
        $this->assertStringContainsString('>Famili Lain<', $biodata);

        $this->acceptResult($letterId);
        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letterId}/fulfillment")
            ->assertJsonPath('data.action', 'create_citizen')
            ->assertJsonPath('data.fields.0.column', 'nik');
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => ['nik' => '3205020202200003']])
            ->assertOk();

        $child = Citizen::query()->where('name', 'Bayu Pratama')->firstOrFail();
        $this->assertSame($this->family->id, $child->family_id);
        $this->assertSame('famili_lain', $child->family_role->value);
        Notification::assertNotSentTo($this->originHead['user'], FamilyMemberMovedNotification::class);
    }

    public function test_one_nik_belongs_to_one_person_and_parents_match_their_gender(): void
    {
        // Anak tanpa NIK (diketik) agar NIK orang tua kandung ikut ditanyakan.
        $payload = [
            ...$this->decision(),
            'nama_anak' => 'Bayu Pratama', 'jenis_kelamin_anak' => 'L', 'tempat_lahir_anak' => 'Garut', 'tanggal_lahir_anak' => '2020-02-02',
        ];

        // Satu NIK di luar data desa dipakai untuk empat identitas: ditolak.
        $this->submit([...$payload, 'nik_ibu_kandung' => '1231231231231231', 'nik_ayah_kandung' => '1231231231231231', 'nik_ibu_angkat' => '1231231231231231', 'nik_saksi_1' => '1231231231231231'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.nik_ibu_kandung', 'payload.nik_ayah_kandung', 'payload.nik_ibu_angkat', 'payload.nik_saksi_1']);

        // Satu NIK warga desa untuk ibu angkat dan ibu kandung sekaligus: ditolak.
        $this->submit([...$payload, 'nik_ibu_angkat' => '3207244101820002', 'nik_ibu_kandung' => '3207244101820002'])
            ->assertJsonValidationErrors(['payload.nik_ibu_kandung' => 'NIK ini sudah dipakai untuk NIK Ibu Angkat; satu NIK hanya untuk satu orang.']);

        // NIK warga desa harus sesuai jenis kelaminnya; NIK pemohon tidak boleh dipakai.
        $this->submit([...$payload, 'nik_ibu_angkat' => '3207240101750009'])
            ->assertJsonValidationErrors(['payload.nik_ibu_angkat' => 'NIK ini terdaftar atas warga laki-laki; isi NIK perempuan.']);
        $this->submit([...$payload, 'nik_ayah_kandung' => '3207244101820002'])
            ->assertJsonValidationErrors(['payload.nik_ayah_kandung' => 'NIK ini terdaftar atas warga perempuan; isi NIK laki-laki.']);
        $this->submit([...$payload, 'nik_ayah_kandung' => '3207240101800001'])
            ->assertJsonValidationErrors(['payload.nik_ayah_kandung' => 'NIK ini milik Anda sendiri; isi NIK orang yang dimaksud.']);

        // Saksi bukan orang tua dalam surat, dan Saksi I bukan Saksi II.
        $this->submit([...$payload, 'nik_ibu_angkat' => '3207244101820002', 'nik_saksi_2' => '3207244101820002'])
            ->assertJsonValidationErrors(['payload.nik_saksi_2' => 'Saksi tidak boleh orang yang sama dengan NIK Ibu Angkat.']);
        $this->submit([...$payload, 'nik_saksi_2' => '3207010101800001'])
            ->assertJsonValidationErrors('payload.nik_saksi_2');

        $this->submit([...$payload, 'nik_ibu_angkat' => '3207244101820002', 'nik_ayah_kandung' => '3207240101750009'])->assertCreated();
    }

    public function test_a_family_head_with_members_cannot_be_adopted_before_the_head_changes(): void
    {
        $this->submit([...$this->decision(), 'nik_anak' => '3207240101750009'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.nik_anak');
    }

    /**
     * @return array<string, mixed>
     */
    private function decision(): array
    {
        return [
            'nomor_penetapan' => '123/Pdt.P/2026/PA.Cms',
            'tanggal_penetapan' => '2026-09-01',
            'nama_pengadilan_penetapan' => 'Pengadilan Agama Ciamis',
            'tempat_pengadilan_penetapan' => 'Ciamis',
            'nik_saksi_1' => '3207010101800001',
            'nama_saksi_1' => 'Saksi Satu',
            'nik_saksi_2' => '3207010101800002',
            'nama_saksi_2' => 'Saksi Dua',
        ];
    }

    private function submit(array $payload)
    {
        return $this->actingAs($this->applicant['user'])->post('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F10')->value('id'),
            'payload' => $payload,
        ], self::JSON);
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
            ], self::JSON)
            ->assertCreated()
            ->json('data.id');
        $this->actingAs($this->kasi['user'])
            ->patchJson("/api/letters/{$letterId}/results/{$resultId}", ['decision' => 'accepted'])
            ->assertOk();
    }

    private function boxes(string $value): string
    {
        return '/'.implode('<\/td><td class=x\d+>', array_map(fn (string $char): string => preg_quote($char, '/'), mb_str_split($value))).'/';
    }

    private function render(string $letterId, ?string $document, bool $landscape = false): string
    {
        $rendered = null;
        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('setPaper')->andReturnSelf();
        $pdf->shouldReceive('download')->once()->andReturn(new Response('', 200));
        Pdf::shouldReceive('loadView')
            ->once()
            ->with('pdf.templates.letter', Mockery::on(function (array $data) use (&$rendered): bool {
                $rendered = $data['template'];

                return true;
            }))
            ->andReturn($pdf);

        $query = $document === null ? '' : "&document={$document}";
        $this->actingAs($this->applicant['user'])
            ->get("/api/letters/{$letterId}/download?{$query}")
            ->assertOk();

        return (string) $rendered;
    }
}
