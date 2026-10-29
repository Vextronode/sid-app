<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Letter;
use App\Models\LetterType;
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
 * F05 Pelaporan Kelahiran: F-2.01 (utama, kotak per karakter sesuai Excel),
 * F-2.03 bila tanpa surat keterangan lahir, F-2.10 bila ayah mengakui anak;
 * Terapkan menambahkan anak ke KK pemohon dengan NIK dari KK baru.
 */
class BirthReportServiceTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $rtApprover;

    private array $kades;

    private array $kasi;

    private Citizen $mother;

    private Family $family;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');
        $this->travelTo(now()->setDate(2026, 10, 12)->setTime(9, 0));

        $this->village = Village::factory()->create(['name' => 'Desa Cibenda', 'district' => 'Parigi', 'regency' => 'Pangandaran', 'province' => 'Jawa Barat']);
        $this->seed([ApprovalFlowSeeder::class, ServiceLetterTypeSeeder::class]);

        ['rt' => $rt] = $this->makeArea($this->village);
        $this->family = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218011304150001']);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'name' => 'Engkos Sutisna',
            'nik' => '3207241105800001',
            'gender' => 'L',
            'family_id' => $this->family->id,
            'family_role' => 'kepala_keluarga',
            'date_of_birth' => '1980-05-11',
        ]);
        $this->mother = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'rt_id' => $rt->id,
            'name' => 'Ika Asmaulatipah',
            'nik' => '3207285106880002',
            'gender' => 'P',
            'family_id' => $this->family->id,
            'family_role' => 'istri',
            'place_of_birth' => 'Ciamis',
            'date_of_birth' => '1988-06-11',
            'address' => 'Dusun Budiasih',
        ]);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
        $this->kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village);
    }

    public function test_birth_report_prints_the_parents_and_child_in_the_boxes_of_f2_01(): void
    {
        $letterId = $this->approve([...$this->payload(), 'ayah' => $this->applicant['citizen']->id]);

        $this->assertNull(Letter::query()->findOrFail($letterId)->letter_number);
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_02', 'f1_01']);

        $form = $this->render($letterId, null);
        $this->assertStringContainsString('FORMULIR PELAPORAN PENCATATAN SIPIL', $form);
        $this->assertStringContainsString('Jawa Barat', $form);
        // Kotak per karakter: nama anak, NIK ibu, tanggal lahir, pukul.
        $this->assertMatchesRegularExpression($this->boxes('SYFA'), $form);
        $this->assertMatchesRegularExpression($this->boxes('3207285106880002'), $form);
        $this->assertMatchesRegularExpression($this->boxes('ENGKOS'), $form);
        $this->assertMatchesRegularExpression($this->boxes('0830'), $form);
        $this->assertMatchesRegularExpression($this->boxes('INDONESIA'), $form);
        $this->assertStringNotContainsString('[[', $form);
        $this->assertStringNotContainsString('________', $form);
        $this->assertStringContainsString('( Engkos Sutisna )', $form);
    }

    public function test_the_child_joins_the_family_card_through_f1_02_and_f1_01(): void
    {
        $this->mother->update(['religion' => 'islam']);
        $letterId = $this->approve([...$this->payload(), 'ayah' => $this->applicant['citizen']->id]);

        // F-1.02: perubahan KK karena peristiwa penting; lampiran KK lama,
        // bukti peristiwa penting (surat keterangan lahir), dan buku nikah.
        $registration = $this->render($letterId, 'f1_02');
        $this->assertStringContainsString('Peristiwa Penting <b>V</b>', $registration);
        $this->assertSame(3, preg_match_all('/xf-circle>V</', $registration));

        // F-1.01: susunan KK pemohon, anak di baris terakhir.
        $biodata = $this->render($letterId, 'f1_01', landscape: true);
        foreach (['>Engkos Sutisna<', '>Ika Asmaulatipah<', '>Syfa Wijayanti<', '1 Oktober 2026', '>Belum Kawin<', '>Tidak/Belum Sekolah<', '>Belum/Tidak Bekerja<', '>3<'] as $value) {
            $this->assertStringContainsString($value, $biodata);
        }
        // Orang tua anak: ibu dan ayah dari KK, agama mengikuti ibu.
        $this->assertSame(1, substr_count($biodata, '>3207285106880002<'));
        $this->assertStringContainsString('>3207241105800001<', $biodata);
        $this->assertStringContainsString('>Islam<', $biodata);
    }

    public function test_father_outside_the_family_is_printed_from_the_typed_fields_in_f1_01(): void
    {
        $letterId = $this->approve([
            ...$this->payload(),
            'nama_ayah' => 'Asep Hidayat',
            'nik_ayah' => '3207010202850009',
            'tempat_lahir_ayah' => 'Ciamis',
            'tanggal_lahir_ayah' => '1985-02-03',
        ]);

        $biodata = $this->render($letterId, 'f1_01', landscape: true);
        $this->assertStringContainsString('>Asep Hidayat<', $biodata);
        $this->assertStringContainsString('>3207010202850009<', $biodata);
    }

    public function test_birth_without_certificate_to_unrecorded_parents_issues_f2_03_and_f2_04(): void
    {
        $letterId = $this->approve([
            ...$this->payload(),
            'nama_ayah' => 'Asep Hidayat',
            'tempat_lahir_ayah' => 'Ciamis',
            'tanggal_lahir_ayah' => '1985-02-03',
            'surat_lahir' => 'tidak',
            'nama_penolong' => 'Bidan Rina',
            'pekerjaan_penolong' => 'Bidan',
            'alamat_penolong' => 'Dusun Budiasih',
            'perkawinan_ortu' => 'belum_tercatat',
            'pekerjaan_ayah' => 'lainnya',
            'pekerjaan_ayah_lainnya' => 'buruh tani',
            'alamat_ayah' => 'Dusun Sinargalih',
        ]);

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertJsonPath('data.documents.*.key', ['main', 'f1_02', 'f1_01', 'f2_03', 'f2_04']);

        // Ayah di luar KK memakai isian ketik.
        $this->assertMatchesRegularExpression($this->boxes('ASEP'), $this->render($letterId, null));

        $statement = $this->render($letterId, 'f2_03');
        $this->assertStringContainsString('KEBENARAN DATA KELAHIRAN', $statement);
        $this->assertStringContainsString('Ika Asmaulatipah', $statement);
        $this->assertStringContainsString('Ciamis, 11 Juni 1988', $statement);
        $this->assertStringContainsString('Bidan Rina', $statement);
        $this->assertStringContainsString('( Saksi Satu )', $statement);

        // F-2.04: ibu bayi menyatakan ayah (diketik) adalah suaminya.
        $spouse = $this->render($letterId, 'f2_04');
        $this->assertStringContainsString('KEBENARAN SEBAGAI PASANGAN SUAMI ISTERI', $spouse);
        $this->assertStringContainsString('adalah suami dari :', $spouse);
        $this->assertStringContainsString('>Ika Asmaulatipah<', $spouse);
        $this->assertStringContainsString('>Asep Hidayat<', $spouse);
        $this->assertStringContainsString('Ciamis, 3 Februari 1985', $spouse);
        $this->assertStringContainsString('Buruh Tani', $spouse);
        $this->assertStringContainsString('Dusun Sinargalih', $spouse);

        // F-1.02: lampiran SPTJM (bukan buku nikah).
        $this->assertSame(3, preg_match_all('/xf-circle>V</', $this->render($letterId, 'f1_02')));
    }

    public function test_mother_must_be_a_female_and_father_a_male_family_member(): void
    {
        // Anak perempuan yang melahirkan tetap dapat dipilih sebagai ibu.
        $daughter = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'family_id' => $this->family->id,
            'family_role' => 'anak',
            'gender' => 'P',
            'date_of_birth' => '2005-01-01',
        ]);
        // Anak perempuan yang belum 10 tahun lebih tua dari bayi tidak dapat dipilih.
        $youngDaughter = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'family_id' => $this->family->id,
            'family_role' => 'anak',
            'gender' => 'P',
            'date_of_birth' => '2020-01-01',
        ]);
        $submit = fn (array $parents) => $this->actingAs($this->applicant['user'])->postJson('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F05')->value('id'),
            'payload' => [...$this->payload(), ...$parents],
        ]);

        $submit(['ibu' => $this->applicant['citizen']->id, 'ayah' => $this->mother->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.ibu', 'payload.ayah']);
        $submit(['ibu' => $youngDaughter->id, 'ayah' => $this->applicant['citizen']->id])
            ->assertJsonValidationErrors('payload.ibu');
        $submit(['ibu' => $daughter->id, 'nama_ayah' => 'Ayah Di Luar KK', 'tempat_lahir_ayah' => 'Ciamis', 'tanggal_lahir_ayah' => '2000-01-01'])
            ->assertCreated();
    }

    public function test_the_baby_cannot_be_born_before_its_parents(): void
    {
        $submit = fn (array $payload) => $this->actingAs($this->applicant['user'])->postJson('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F05')->value('id'),
            'payload' => [...$this->payload(), ...$payload],
        ]);

        // Ayah di luar KK dengan tanggal lahir yang diketik sesudah bayi lahir.
        $submit(['nama_ayah' => 'Ayah Di Luar KK', 'tempat_lahir_ayah' => 'Ciamis', 'tanggal_lahir_ayah' => '2026-10-02'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.tanggal_lahir_anak' => 'Tanggal Lahir Anak tidak boleh sebelum tanggal lahir ayah.']);
        // Ibu (anggota KK, lahir 1988) sesudah bayi lahir.
        $submit(['ayah' => $this->applicant['citizen']->id, 'tanggal_lahir_anak' => '1980-01-01'])
            ->assertJsonValidationErrors(['payload.tanggal_lahir_anak' => 'Tanggal Lahir Anak tidak boleh sebelum tanggal lahir ibu.']);
        // Bayi belum lahir (hari ini 12 Oktober 2026), begitu pula tanggal akta.
        $submit(['ayah' => $this->applicant['citizen']->id, 'tanggal_lahir_anak' => '2026-10-13'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.tanggal_lahir_anak' => 'Tanggal Lahir Anak tidak boleh sesudah hari ini.']);
        $submit(['ayah' => $this->applicant['citizen']->id, 'tanggal_lahir_anak' => '2026-10-12'])->assertCreated();
    }

    public function test_only_planned_dates_may_be_in_the_future(): void
    {
        $future = collect(LetterType::query()->where('code', 'like', 'F%')->get())
            ->flatMap(fn (LetterType $type) => collect($type->form_fields)
                ->flatMap(fn (array $field) => [$field, ...($field['fields'] ?? [])])
                ->filter(fn (array $field) => ($field['type'] ?? null) === 'date' && ! ($field['past'] ?? false))
                ->pluck('name'))
            ->unique()
            ->sort()
            ->values()
            ->all();

        $this->assertSame(['rencana_tanggal_pindah', 'tanggal_itas'], $future);
    }

    public function test_birth_time_must_come_from_the_time_input(): void
    {
        $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => LetterType::query()->where('code', 'F05')->value('id'),
                'payload' => [...$this->payload(), 'ayah' => $this->applicant['citizen']->id, 'pukul_lahir' => 'jam 8 pagi'],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.pukul_lahir');
    }

    public function test_kasi_adds_the_child_to_the_family_after_the_birth_certificate_is_accepted(): void
    {
        $letterId = $this->approve([...$this->payload(), 'ayah' => $this->applicant['citizen']->id]);

        $resultId = $this->actingAs($this->applicant['user'])
            ->post("/api/letters/{$letterId}/results", [
                'files' => [UploadedFile::fake()->create('akta.pdf', 100, 'application/pdf')],
            ], ['Accept' => 'application/json'])
            ->json('data.id');
        $this->actingAs($this->kasi['user'])
            ->patchJson("/api/letters/{$letterId}/results/{$resultId}", ['decision' => 'accepted'])
            ->assertOk();

        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letterId}/fulfillment")
            ->assertOk()
            ->assertJsonPath('data.action', 'create_citizen');
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letterId}/fulfillment", ['values' => ['nik' => '3218016909160002', 'birth_certificate_number' => '3218-LT-01102026-0005']])
            ->assertOk();

        $child = Citizen::query()->where('name', 'Syfa Wijayanti')->firstOrFail();
        $this->assertSame($this->family->id, $child->family_id);
        $this->assertSame('anak', $child->family_role->value);
        $this->assertSame('P', $child->gender);
        $this->assertSame('2026-10-01', $child->date_of_birth->toDateString());
        $this->assertSame('Ika Asmaulatipah', $child->mother_name_text);
        $this->assertSame('Engkos Sutisna', $child->father_name_text);
        // No. akta lahir dari akta terbitan, diisi Kasi saat Terapkan.
        $this->assertSame('3218-LT-01102026-0005', $child->birth_certificate_number);
    }

    /**
     * Pola kotak berurutan berisi tiap karakter.
     */
    private function boxes(string $value): string
    {
        return '/'.implode('<\/td><td class=x\d+>', array_map(fn (string $char): string => preg_quote($char, '/'), str_split($value))).'/';
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        return [
            'nama_anak' => 'Syfa Wijayanti',
            'jenis_kelamin_anak' => 'P',
            'tempat_dilahirkan' => 'rumah',
            'tempat_kelahiran' => 'Pangandaran',
            'tanggal_lahir_anak' => '2026-10-01',
            'pukul_lahir' => '08:30',
            'jenis_kelahiran' => 'tunggal',
            'kelahiran_ke' => 2,
            'penolong_kelahiran' => 'bidan',
            'berat_bayi' => '3,2',
            'panjang_bayi' => 49,
            'ibu' => $this->mother->id,
            'nama_saksi_1' => 'Saksi Satu',
            'nik_saksi_1' => '3207010101800001',
            'nama_saksi_2' => 'Saksi Dua',
            'nik_saksi_2' => '3207010101800002',
            'surat_lahir' => 'ada',
            'perkawinan_ortu' => 'tercatat',
        ];
    }

    private function approve(array $payload): string
    {
        $letterId = $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => LetterType::query()->where('code', 'F05')->value('id'),
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

        return $letterId;
    }

    private function render(string $letterId, ?string $document, bool $landscape = false): string
    {
        $rendered = null;
        $pdf = Mockery::mock(DomPdf::class);

        if ($landscape) {
            $pdf->shouldReceive('setPaper')->once()->with('a4', 'landscape')->andReturnSelf();
        }

        $pdf->shouldReceive('download')->once()->andReturn(new Response('', 200));
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
