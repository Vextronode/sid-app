<?php

namespace Tests\Feature;

use App\Enums\FamilyRole;
use App\Models\Citizen;
use App\Models\Family;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\MigrantWorker;
use App\Models\User;
use App\Models\Village;
use App\Notifications\LetterStatusNotification;
use App\Support\GuardianRelation;
use Database\Seeders\ApprovalFlowSeeder;
use Database\Seeders\ServiceLetterTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Pendataan CPMI (F11): pengajuan disetujui RT lalu Kepala Desa, hasilnya
 * data migrant_workers (satu baris per keberangkatan), bukan surat.
 */
class MigrantWorkerTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private const FILES = [
        'scan_ktp', 'scan_kk', 'scan_akta_lahir', 'scan_ijazah', 'scan_paspor',
        'scan_izin_keluarga', 'scan_perjanjian_kerja', 'scan_surat_sehat', 'scan_bpjs_tk',
    ];

    private Village $village;

    private array $applicant;

    private array $rtApprover;

    private array $kades;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');

        $this->village = Village::factory()->create();
        $this->seed([ApprovalFlowSeeder::class, ServiceLetterTypeSeeder::class]);

        ['rt' => $rt] = $this->makeArea($this->village);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, citizenAttributes: [
            'religion' => 'islam',
            'marital_status' => 'belum_kawin',
            'gender' => 'P',
        ]);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);
    }

    public function test_f11_is_a_data_only_population_service(): void
    {
        $type = $this->letterType();

        $this->assertFalse($type->produces_letter);
        $this->assertFalse($type->requires_result_upload);
        $this->assertFalse($type->issues_letter_number);
        $this->assertSame('pelayanan', $type->category->value);
        $this->assertNull($type->template);
        $this->assertNull($type->documents);
        $this->assertCount(10, array_filter($type->form_fields, fn (array $f): bool => $f['type'] === 'file'));
        $this->assertSame(
            [
                'Data Diri & Identitas (Sesuai KTP/KK)',
                'Data Pendidikan & Kompetensi',
                'Data Orang Tua / Wali / Pasangan (Kontak Darurat)',
                'Data Perusahaan, Sponsor, & Negara Tujuan',
                'Dokumen Wajib',
            ],
            array_values(array_unique(array_column($type->form_fields, 'section'))),
        );
        // Tanpa surat kuasa: tidak ada yang dibawa ke Disdukcapil.
        $this->assertNotContains('pengurusan', array_column($type->form_fields, 'name'));
    }

    public function test_f11_is_offered_to_applicants_although_it_has_no_template(): void
    {
        // Pilihan Ajukan Surat warga: kelompok Layanan Kependudukan.
        $offered = collect($this->actingAs($this->applicant['user'])
            ->getJson('/api/letter-types')
            ->assertOk()
            ->json('data'))
            ->firstWhere('code', 'F11');

        $this->assertNotNull($offered, 'F11 harus tampil di pilihan Ajukan Surat.');
        $this->assertSame('pelayanan', $offered['category']);
        $this->assertFalse($offered['produces_letter']);

        // Katalog jenis surat di halaman publik.
        $this->assertContains(
            'F11',
            collect($this->getJson('/api/public/letter-types')->assertOk()->json('data'))->pluck('code')->all(),
        );

        // Kelola Jenis Surat: bukan draft, dan bisa dinonaktifkan lalu diaktifkan lagi.
        $staff = $this->makeOfficialUser('staf_sid', $this->village);
        $managed = collect($this->actingAs($staff['user'])
            ->getJson('/api/letter-types?include_inactive=1')
            ->assertOk()
            ->json('data'))
            ->firstWhere('code', 'F11');
        $this->assertSame('aktif', $managed['status_label']);

        foreach ([false, true] as $active) {
            $this->actingAs($staff['user'])
                ->putJson("/api/letter-types/{$this->letterType()->id}", ['is_active' => $active])
                ->assertOk();
            $this->assertSame($active, $this->letterType()->is_active);
        }
    }

    public function test_final_approval_records_the_migrant_worker_data(): void
    {
        $letterId = $this->issue([
            'telepon' => '+6281234567890',
            'nama_sekolah' => '  SMK   Negeri 1 ',
            'sertifikat' => [['nama_sertifikat' => 'JLPT N4', 'penerbit' => 'The Japan Foundation', 'tahun' => '2023']],
            'pengalaman_kerja' => [['perusahaan' => 'PT Sentosa', 'jabatan' => 'Operator', 'mulai' => 'Jan 2021', 'selesai' => 'Des 2023']],
        ]);

        $letter = Letter::query()->findOrFail($letterId);
        $worker = MigrantWorker::query()->sole();

        $this->assertSame('approved', $letter->status->value);
        $this->assertNull($letter->letter_number);
        $this->assertSame($letterId, $worker->letter_id);
        $this->assertSame($this->applicant['citizen']->id, $worker->citizen_id);
        $this->assertSame($this->village->id, $worker->village_id);
        $this->assertSame(160, $worker->height_cm);
        $this->assertSame(55, $worker->weight_kg);
        $this->assertSame('081234567890', $worker->phone);
        $this->assertSame('siti@example.com', $worker->email);
        $this->assertSame('SMK Negeri 1', $worker->school_name);
        $this->assertSame(2020, $worker->graduation_year);
        $this->assertSame([['nama_sertifikat' => 'JLPT N4', 'penerbit' => 'The Japan Foundation', 'tahun' => '2023']], $worker->certificates);
        $this->assertSame('PT Sentosa', $worker->work_history[0]['perusahaan']);
        $this->assertNull($worker->work_history[0]['deskripsi']);
        $this->assertSame('ibu', $worker->guardian_relation);
        $this->assertSame('Aminah', $worker->guardian_name);
        $this->assertSame('Kp. Cibenda RT 01 RW 02', $worker->guardian_address);
        $this->assertSame('081298765432', $worker->guardian_phone);
        $this->assertSame('Taiwan', $worker->destination_country);
        $this->assertSame('PT Sinar Abadi', $worker->agency_name);
        $this->assertSame('Caregiver', $worker->position);
        $this->assertSame('2027-03-01', $worker->contract_start->toDateString());
        $this->assertSame('2030-02-28', $worker->contract_end->toDateString());
        $this->assertTrue($letter->migrantWorker->is($worker));
        $this->assertCount(10, $letter->attachments()->where('kind', 'field')->get());
    }

    public function test_guardian_from_the_family_card_takes_name_and_address_from_population_data(): void
    {
        $family = Family::factory()->create(['village_id' => $this->village->id, 'rt_id' => $this->applicant['citizen']->rt_id]);
        $this->applicant['citizen']->update(['family_id' => $family->id, 'family_role' => 'anak']);
        $mother = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'family_id' => $family->id,
            'family_role' => 'istri',
            'rt_id' => $this->applicant['citizen']->rt_id,
            'name' => 'Aminah Binti Karta',
            'gender' => 'P',
            'address' => 'Kp. Sukamaju',
        ]);

        $letterId = $this->issue([
            'penanggung_jawab_sumber' => 'kk',
            'penanggung_jawab_anggota' => $mother->id,
            // Dari KK: hubungan, nama, dan alamat tidak diambil dari isian.
            'penanggung_jawab_hubungan' => 'wali',
            'penanggung_jawab_nama' => 'Diabaikan',
            'penanggung_jawab_alamat' => 'Diabaikan',
            'penanggung_jawab_email' => 'aminah@example.com',
        ]);

        $worker = MigrantWorker::query()->sole();
        $this->assertSame('Aminah Binti Karta', $worker->guardian_name);
        $this->assertStringStartsWith('Kp. Sukamaju', $worker->guardian_address);
        // Pemohon anak, anggota istri kepala keluarga (perempuan) = ibu.
        $this->assertSame('ibu', $worker->guardian_relation);
        $this->assertSame('aminah@example.com', $worker->guardian_email);
        $this->assertSame('Ibu', Letter::query()->findOrFail($letterId)->payload['penanggung_jawab_hubungan_label']);

        $this->actingAs($this->kades['user'])
            ->getJson("/api/migrant-workers/{$worker->id}")
            ->assertOk()
            ->assertJsonPath('data.guardian_relation_label', 'Ibu')
            ->assertJsonPath('data.guardian_email', 'aminah@example.com');
    }

    public function test_spouse_outside_the_family_card_follows_the_applicants_gender_and_marriage(): void
    {
        // Belum kawin: Suami/Istri tidak bisa dipilih.
        $this->rejectsRelation('suami');

        // Laki-laki kawin: Istri, bukan Suami.
        $this->applicant['citizen']->update(['gender' => 'L', 'marital_status' => 'kawin']);
        $this->applicant['user']->unsetRelation('citizen');
        $this->rejectsRelation('suami');
        $this->submit(['penanggung_jawab_hubungan' => 'istri']);

        // Perempuan kawin: Suami, bukan Istri.
        $this->applicant['citizen']->update(['gender' => 'P']);
        $this->applicant['user']->unsetRelation('citizen');
        $this->rejectsRelation('istri');
        $this->submit(['penanggung_jawab_hubungan' => 'suami']);
    }

    public function test_guardian_relation_is_derived_from_both_family_roles(): void
    {
        $cases = [
            ['kepala_keluarga', 'istri', 'P', 'istri'],
            ['istri', 'kepala_keluarga', 'L', 'suami'],
            ['anak', 'kepala_keluarga', 'L', 'ayah'],
            ['anak', 'istri', 'P', 'ibu'],
            ['anak', 'anak', 'L', 'saudara'],
            ['kepala_keluarga', 'orang_tua', 'P', 'ibu'],
            ['istri', 'orang_tua', 'P', 'mertua'],
            ['kepala_keluarga', 'anak', 'L', 'anak'],
            ['anak', 'orang_tua', 'L', 'kakek_nenek'],
            ['famili_lain', 'kepala_keluarga', 'L', 'famili_lain'],
        ];

        foreach ($cases as [$applicant, $member, $gender, $expected]) {
            $this->assertSame(
                $expected,
                GuardianRelation::between(FamilyRole::from($applicant), FamilyRole::from($member), $gender),
                "{$applicant} -> {$member} ({$gender})",
            );
        }
    }

    public function test_other_country_is_typed(): void
    {
        $this->issue(['negara_tujuan' => 'lainnya', 'negara_tujuan_lainnya' => 'Polandia']);

        $this->assertSame('Polandia', MigrantWorker::query()->sole()->destination_country);
    }

    public function test_each_departure_adds_a_record(): void
    {
        $this->issue(['negara_tujuan' => 'Malaysia']);
        $this->issue(['negara_tujuan' => 'Taiwan', 'kontrak_mulai' => '2031-01-01', 'kontrak_selesai' => '2033-01-01']);

        $this->assertSame(
            ['Malaysia', 'Taiwan'],
            $this->applicant['citizen']->migrantWorkers()->orderBy('contract_start')->pluck('destination_country')->all(),
        );
    }

    public function test_sensitive_columns_are_encrypted_at_rest(): void
    {
        $this->issue();

        $row = DB::table('migrant_workers')->sole();

        foreach (['phone' => '081234567890', 'guardian_phone' => '081298765432', 'salary_facilities' => 'NTD 20.000/bulan, makan dan asrama'] as $column => $plain) {
            $this->assertNotSame($plain, $row->{$column});
            $this->assertSame($plain, Crypt::decryptString($row->{$column}));
        }
    }

    public function test_unfinished_or_rejected_submissions_record_nothing(): void
    {
        $letterId = $this->submit();
        $this->decide($this->rtApprover['user'], 'rt', $letterId, 'approved');
        $this->assertDatabaseCount('migrant_workers', 0);

        $this->decide($this->kades['user'], 'kades', $letterId, 'rejected');
        $this->assertDatabaseCount('migrant_workers', 0);
    }

    public function test_all_ten_documents_are_required(): void
    {
        $this->actingAs($this->applicant['user'])
            ->post('/api/letters', [
                'letter_type_id' => $this->letterType()->id,
                'payload' => $this->payload(),
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['files.pas_foto', 'files.scan_paspor', 'files.scan_bpjs_tk']);
    }

    public function test_contract_end_must_be_after_contract_start(): void
    {
        $this->actingAs($this->applicant['user'])
            ->post('/api/letters', [
                'letter_type_id' => $this->letterType()->id,
                'payload' => $this->payload(['kontrak_mulai' => '2027-03-01', 'kontrak_selesai' => '2027-01-01']),
                'files' => $this->files(),
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.kontrak_selesai']);
    }

    public function test_no_letter_pdf_and_the_applicant_is_told_the_data_is_saved(): void
    {
        $letterId = $this->issue();

        $this->actingAs($this->applicant['user'])
            ->get("/api/letters/{$letterId}/download", ['Accept' => 'application/json'])
            ->assertNotFound();

        Notification::assertSentTo(
            $this->applicant['user'],
            LetterStatusNotification::class,
            fn (LetterStatusNotification $n): bool => $n->toArray($this->applicant['user'])['title'] === 'Pendataan Disetujui',
        );

        $this->actingAs($this->applicant['user'])
            ->getJson('/api/letters')
            ->assertOk()
            ->assertJsonFragment(['code' => 'F11', 'produces_letter' => false]);
    }

    public function test_officials_list_and_open_the_data_with_its_documents(): void
    {
        $this->issue();
        $worker = MigrantWorker::query()->sole();
        $kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village);

        foreach ([$this->kades['user'], $kasi['user']] as $official) {
            $this->actingAs($official)
                ->getJson('/api/migrant-workers?contract_status=akan_berangkat&destination_country=Taiwan')
                ->assertOk()
                ->assertJsonPath('total', 1)
                ->assertJsonPath('data.0.citizen.name', $this->applicant['citizen']->name)
                ->assertJsonPath('data.0.contract_status', 'akan_berangkat')
                ->assertJsonPath('filters.countries', ['Taiwan'])
                ->assertJsonMissingPath('data.0.phone');
        }

        $this->actingAs($kasi['user'])
            ->getJson('/api/migrant-workers?contract_status=berakhir')
            ->assertOk()
            ->assertJsonPath('total', 0);

        $detail = $this->actingAs($kasi['user'])
            ->getJson("/api/migrant-workers/{$worker->id}")
            ->assertOk()
            ->assertJsonPath('data.identity.religion', 'islam')
            ->assertJsonPath('data.phone', '081234567890')
            ->assertJsonPath('data.guardian_name', 'Aminah')
            ->assertJsonCount(10, 'data.documents');

        $this->actingAs($kasi['user'])
            ->get($detail->json('data.documents.0.url'))
            ->assertOk();
    }

    public function test_rt_and_other_citizens_cannot_open_the_data(): void
    {
        $this->issue();
        $worker = MigrantWorker::query()->sole();
        $neighbour = $this->makeCitizenAccount($this->village, null);

        foreach ([$this->rtApprover['user'], $neighbour['user']] as $user) {
            $this->actingAs($user)->getJson('/api/migrant-workers')->assertForbidden();
            $this->actingAs($user)->getJson("/api/migrant-workers/{$worker->id}")->assertForbidden();
        }

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/migrant-workers/{$worker->id}")
            ->assertOk();
    }

    public function test_current_user_carries_the_menu_flag_and_the_mother_name_for_the_form(): void
    {
        $mother = Citizen::factory()->create(['village_id' => $this->village->id, 'name' => 'Aminah Binti Karta', 'gender' => 'P']);
        $this->applicant['citizen']->update(['mother_id' => $mother->id]);

        $this->actingAs($this->applicant['user'])
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.can_view_migrant_workers', false)
            ->assertJsonPath('data.citizen.mother_name', 'Aminah Binti Karta');

        $this->actingAs($this->kades['user'])
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.can_view_migrant_workers', true);

        $this->actingAs($this->rtApprover['user'])
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.can_view_migrant_workers', false);
    }

    public function test_applicant_sees_own_history_and_the_next_form_is_prefilled(): void
    {
        $this->actingAs($this->applicant['user'])
            ->getJson('/api/profile/migrant-workers/prefill')
            ->assertOk()
            ->assertExactJson(['data' => []]);

        $this->issue(['negara_tujuan' => 'Malaysia']);
        $this->issue(['nama_sekolah' => 'SMK Negeri 2', 'kontrak_mulai' => '2031-01-01', 'kontrak_selesai' => '2033-01-01']);

        $this->actingAs($this->applicant['user'])
            ->getJson('/api/profile/migrant-workers')
            ->assertOk()
            ->assertJsonPath('total', 2);

        $prefill = $this->actingAs($this->applicant['user'])
            ->getJson('/api/profile/migrant-workers/prefill')
            ->assertOk()
            ->json('data');

        $this->assertSame('SMK Negeri 2', $prefill['nama_sekolah']);
        $this->assertSame('Aminah', $prefill['penanggung_jawab_nama']);
        // Kontrak dan penempatan selalu baru.
        $this->assertArrayNotHasKey('negara_tujuan', $prefill);
        $this->assertArrayNotHasKey('kontrak_mulai', $prefill);
    }

    // ------------------------------------------------------------------

    private function rejectsRelation(string $relation): void
    {
        $this->actingAs($this->applicant['user'])
            ->post('/api/letters', [
                'letter_type_id' => $this->letterType()->id,
                'payload' => $this->payload(['penanggung_jawab_hubungan' => $relation]),
                'files' => $this->files(),
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['payload.penanggung_jawab_hubungan']);
    }

    /** @param  array<string, mixed>  $overrides */
    private function issue(array $overrides = []): string
    {
        $letterId = $this->submit($overrides);

        $this->decide($this->rtApprover['user'], 'rt', $letterId, 'approved');
        $this->decide($this->kades['user'], 'kades', $letterId, 'approved');

        return $letterId;
    }

    /** @param  array<string, mixed>  $overrides */
    private function submit(array $overrides = []): string
    {
        return $this->actingAs($this->applicant['user'])
            ->post('/api/letters', [
                'letter_type_id' => $this->letterType()->id,
                'payload' => $this->payload($overrides),
                'files' => $this->files(),
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('data.id');
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'tinggi_badan' => '160',
            'berat_badan' => '55',
            'telepon' => '081234567890',
            'email' => 'siti@example.com',
            'pendidikan_terakhir' => 'sma',
            'nama_sekolah' => 'SMK Negeri 1',
            'jurusan' => 'Keperawatan',
            'tahun_lulus' => '2020',
            'penanggung_jawab_sumber' => 'luar_kk',
            'penanggung_jawab_hubungan' => 'ibu',
            'penanggung_jawab_nama' => 'Aminah',
            'penanggung_jawab_alamat' => 'Kp. Cibenda RT 01 RW 02',
            'penanggung_jawab_telepon' => '081298765432',
            'negara_tujuan' => 'Taiwan',
            'nama_pemberi_kerja' => 'Chen Family',
            'alamat_pemberi_kerja' => 'No. 1, Zhongshan Rd, Taipei',
            'kontak_pemberi_kerja' => '+886 2 1234 5678',
            'nama_p3mi' => 'PT Sinar Abadi',
            'kontak_p3mi' => '0211234567',
            'jabatan_kerja' => 'Caregiver',
            'gaji_fasilitas' => 'NTD 20.000/bulan, makan dan asrama',
            'kontrak_mulai' => '2027-03-01',
            'kontrak_selesai' => '2030-02-28',
            ...$overrides,
        ];
    }

    /** @return array<string, UploadedFile> */
    private function files(): array
    {
        $files = ['pas_foto' => UploadedFile::fake()->image('foto.jpg')];

        foreach (self::FILES as $name) {
            $files[$name] = UploadedFile::fake()->create("{$name}.pdf", 100, 'application/pdf');
        }

        return $files;
    }

    private function decide(User $user, string $level, string $letterId, string $status): void
    {
        $this->actingAs($user)
            ->patchJson("/api/{$level}/letters/{$letterId}/decision", [
                'status' => $status,
                ...($status === 'rejected' ? ['notes' => 'Paspor buram.'] : []),
            ])
            ->assertOk();
    }

    private function letterType(): LetterType
    {
        return LetterType::query()
            ->where('village_id', $this->village->id)
            ->where('code', MigrantWorker::SOURCE_LETTER_TYPE_CODE)
            ->firstOrFail();
    }
}
