<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterAttachment;
use App\Models\LetterType;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

class LetterSubmissionSchemaTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $rtApprover;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        Storage::fake('private_uploads');

        $this->village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($this->village);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->makeOfficialUser('kepala_desa', $this->village);
    }

    public function test_payload_is_validated_against_letter_type_form_fields(): void
    {
        $letterType = $this->letterTypeWithFields();

        $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $letterType->id,
                'purpose' => 'Keperluan',
                'payload' => [
                    'tanggal_meninggal' => 'bukan-tanggal',
                    'tidak_terdaftar' => 'x',
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['payload', 'payload.nama_almarhum', 'payload.tanggal_meninggal']);

        $this->assertDatabaseCount('letters', 0);
    }

    public function test_valid_payload_is_stored_and_optional_fields_may_be_omitted(): void
    {
        $letterType = $this->letterTypeWithFields();

        $letterId = $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $letterType->id,
                'purpose' => 'Keperluan',
                'payload' => [
                    'nama_almarhum' => 'Fulan',
                    'tanggal_meninggal' => '2026-10-01',
                ],
            ])
            ->assertCreated()
            ->json('data.id');

        $this->assertSame(
            ['nama_almarhum' => 'Fulan', 'tanggal_meninggal' => '2026-10-01'],
            Letter::query()->findOrFail($letterId)->payload,
        );
    }

    public function test_letter_type_without_extra_fields_rejects_any_payload_key(): void
    {
        $letterType = LetterType::factory()->create([
            'flow_id' => $this->makeDefaultFlow()->id,
            'form_fields' => [],
        ]);

        $this->actingAs($this->applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $letterType->id,
                'purpose' => 'Keperluan',
                'payload' => ['signature_img' => '<img>'],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['payload']);
    }

    public function test_letter_type_definition_is_exposed_to_the_form(): void
    {
        $letterType = $this->letterTypeWithFields(['template' => 'tpl']);

        $this->actingAs($this->applicant['user'])
            ->getJson('/api/letter-types')
            ->assertOk()
            ->assertJsonPath('data.0.id', $letterType->id)
            ->assertJsonPath('data.0.form_fields.0.name', 'nama_almarhum')
            ->assertJsonPath('data.0.produces_letter', true)
            ->assertJsonPath('data.0.data_action', 'none')
            ->assertJsonMissingPath('data.0.category_id');
    }

    public function test_attachments_are_stored_privately_and_served_only_to_viewers_of_the_letter(): void
    {
        $letterType = $this->letterTypeWithFields();
        $outsider = $this->makeCitizenAccount($this->village, null);

        $letterId = $this->actingAs($this->applicant['user'])
            ->post('/api/letters', [
                'letter_type_id' => $letterType->id,
                'purpose' => 'Keperluan',
                'payload' => ['nama_almarhum' => 'Fulan', 'tanggal_meninggal' => '2026-10-01'],
                // Lampiran bebas tidak lagi diterima; hanya berkas isian.
                'attachments' => [UploadedFile::fake()->create('ktp.pdf', 100, 'application/pdf')],
                'files' => ['surat_dokter' => UploadedFile::fake()->image('dokter.jpg')],
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('data.id');

        $attachments = LetterAttachment::query()->where('letter_id', $letterId)->orderBy('id')->get();
        $this->assertCount(1, $attachments);
        $this->assertSame('field', $attachments[0]->kind);
        $this->assertSame('surat_dokter', $attachments[0]->field);
        Storage::disk('private_uploads')->assertExists($attachments[0]->path);

        $detail = $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letterId}")
            ->assertOk()
            ->assertJsonCount(1, 'data.attachments')
            ->assertJsonMissingPath('data.attachments.0.path');
        $url = $detail->json('data.attachments.0.url');

        $this->actingAs($this->applicant['user'])->get($url)->assertOk();
        $this->actingAs($this->rtApprover['user'])->get($url)->assertOk();
        $this->actingAs($outsider['user'])->getJson($url)->assertForbidden();
    }

    public function test_attachment_of_another_letter_cannot_be_read_through_a_visible_letter(): void
    {
        $letterType = $this->letterTypeWithFields();
        $other = $this->makeCitizenAccount($this->village, null);
        $submit = fn (array $account) => $this->actingAs($account['user'])
            ->post('/api/letters', [
                'letter_type_id' => $letterType->id,
                'purpose' => 'Keperluan',
                'payload' => ['nama_almarhum' => 'Fulan', 'tanggal_meninggal' => '2026-10-01'],
                'files' => ['surat_dokter' => UploadedFile::fake()->create('dokter.pdf', 100, 'application/pdf')],
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('data.id');

        $mine = $submit($this->applicant);
        $theirs = $submit($other);
        $theirAttachment = LetterAttachment::query()->where('letter_id', $theirs)->firstOrFail();

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$mine}/attachments/{$theirAttachment->id}")
            ->assertNotFound();
    }

    public function test_deleting_a_letter_removes_its_files(): void
    {
        $letterType = $this->letterTypeWithFields();
        $letterId = $this->actingAs($this->applicant['user'])
            ->post('/api/letters', [
                'letter_type_id' => $letterType->id,
                'purpose' => 'Keperluan',
                'payload' => ['nama_almarhum' => 'Fulan', 'tanggal_meninggal' => '2026-10-01'],
                'files' => ['surat_dokter' => UploadedFile::fake()->create('dokter.pdf', 100, 'application/pdf')],
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('data.id');
        $path = LetterAttachment::query()->where('letter_id', $letterId)->value('path');
        Storage::disk('private_uploads')->assertExists($path);

        $this->actingAs($this->applicant['user'])
            ->deleteJson("/api/letters/{$letterId}")
            ->assertOk();

        Storage::disk('private_uploads')->assertMissing($path);
    }

    private function letterTypeWithFields(array $attributes = []): LetterType
    {
        return LetterType::factory()->create([
            'flow_id' => $this->makeDefaultFlow()->id,
            'form_fields' => [
                ['name' => 'nama_almarhum', 'label' => 'Nama Alm.', 'type' => 'text', 'required' => true],
                ['name' => 'tanggal_meninggal', 'label' => 'Tanggal Meninggal', 'type' => 'date', 'required' => true],
                ['name' => 'sebab', 'label' => 'Sebab', 'type' => 'text', 'required' => false],
                ['name' => 'surat_dokter', 'label' => 'Surat Dokter', 'type' => 'file', 'required' => false],
            ],
            ...$attributes,
        ]);
    }
}
