<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Village;
use App\Notifications\LetterStatusNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

class LetterFulfillmentTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $kasi;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($this->village);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'name' => 'Nama Lama',
            'place_of_birth' => 'Tempat Lama',
        ]);
        $this->kasi = $this->makeOfficialUser('kasi_pelayanan', $this->village);
    }

    public function test_assigned_kasi_reviews_proposal_and_applies_it_with_corrections(): void
    {
        $letter = $this->approvedUpdateLetter(['nama_benar' => 'Nama Benar']);

        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letter->id}/fulfillment")
            ->assertOk()
            ->assertJsonPath('data.action', 'update_citizen')
            ->assertJsonPath('data.fields.0.column', 'name')
            ->assertJsonPath('data.fields.0.current', 'Nama Lama')
            ->assertJsonPath('data.fields.0.proposed', 'Nama Benar')
            ->assertJsonPath('data.fields.1.proposed', null);

        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('data.needs_fulfillment', true);

        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letter->id}/fulfillment", [
                'values' => ['place_of_birth' => 'Tempat Benar'],
            ])
            ->assertOk()
            ->assertJsonPath('data.fulfilled_by', $this->kasi['user']->id);

        $citizen = $this->applicant['citizen']->fresh();
        $this->assertSame('Nama Benar', $citizen->name);
        $this->assertSame('Tempat Benar', $citizen->place_of_birth);

        $letter->refresh();
        $this->assertNotNull($letter->fulfilled_at);
        $this->assertSame(
            ['old' => 'Nama Lama', 'new' => 'Nama Benar'],
            $letter->fulfillment['changes']['name'],
        );
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'citizen',
            'event' => 'letter_fulfilled',
            'subject_id' => $citizen->id,
            'causer_id' => $this->kasi['user']->id,
        ]);
        Notification::assertSentTo(
            $this->applicant['user'],
            LetterStatusNotification::class,
            fn (LetterStatusNotification $n): bool => $n->toArray($this->applicant['user'])['context']['status'] === 'letter_fulfilled',
        );

        $this->actingAs($this->kasi['user'])
            ->getJson("/api/letters/{$letter->id}")
            ->assertJsonPath('data.needs_fulfillment', false);
    }

    public function test_fulfillment_cannot_be_applied_twice(): void
    {
        $letter = $this->approvedUpdateLetter(['nama_benar' => 'Nama Benar']);

        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letter->id}/fulfillment")
            ->assertOk();

        $this->applicant['citizen']->update(['name' => 'Diubah Petugas']);

        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letter->id}/fulfillment")
            ->assertStatus(409);

        $this->assertSame('Diubah Petugas', $this->applicant['citizen']->fresh()->name);
    }

    public function test_columns_outside_the_letter_type_definition_are_rejected(): void
    {
        $letter = $this->approvedUpdateLetter(['nama_benar' => 'Nama Benar']);

        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letter->id}/fulfillment", [
                'values' => ['address' => 'Alamat Lain', 'nik' => '3201010101010001'],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['values']);

        $this->assertSame('Nama Lama', $this->applicant['citizen']->fresh()->name);
        $this->assertNull($letter->fresh()->fulfilled_at);
    }

    public function test_invalid_corrected_value_is_rejected(): void
    {
        $letter = $this->approvedUpdateLetter(['nama_benar' => 'Nama Benar']);

        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letter->id}/fulfillment", [
                'values' => ['name' => str_repeat('x', 150)],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['values.name']);
    }

    public function test_only_assigned_kasi_kaur_or_staf_sid_may_apply(): void
    {
        $letter = $this->approvedUpdateLetter(['nama_benar' => 'Nama Benar']);
        $otherKaur = $this->makeOfficialUser('kaur_tu_umum', $this->village);
        $kades = $this->makeOfficialUser('kepala_desa', $this->village);
        $petugas = $this->makeOfficialUser('staf_sid', $this->village);
        $foreignKasi = $this->makeOfficialUser('kasi_pelayanan', Village::factory()->create());

        foreach ([$otherKaur, $kades, $this->applicant, $foreignKasi] as $account) {
            $this->actingAs($account['user'])
                ->postJson("/api/letters/{$letter->id}/fulfillment")
                ->assertForbidden();
        }

        // Petugas Desa adalah cadangan bila Kasi/Kaur berhalangan.
        $this->actingAs($petugas['user'])
            ->postJson("/api/letters/{$letter->id}/fulfillment")
            ->assertOk()
            ->assertJsonPath('data.fulfilled_by', $petugas['user']->id);
    }

    public function test_fulfillment_is_unavailable_before_final_approval_and_for_types_without_data_action(): void
    {
        $pending = $this->approvedUpdateLetter(['nama_benar' => 'Nama Benar'], ['status' => 'in_progress']);
        $plainType = LetterType::factory()->create(['flow_id' => $this->makeDefaultFlow()->id]);
        $plain = Letter::factory()->approved()->create([
            'village_id' => $this->village->id,
            'letter_type_id' => $plainType->id,
            'citizen_id' => $this->applicant['citizen']->id,
            'submitted_by' => $this->applicant['user']->id,
        ]);

        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$pending->id}/fulfillment")
            ->assertForbidden();
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$plain->id}/fulfillment")
            ->assertForbidden();
    }

    public function test_birth_letter_adds_a_new_citizen_in_the_applicants_household(): void
    {
        $letterType = LetterType::factory()->create([
            'flow_id' => $this->makeDefaultFlow()->id,
            'assigned_role' => 'kasi_pelayanan',
            'data_action' => 'create_citizen',
            'data_fields' => [
                ['column' => 'nik', 'label' => 'NIK Anak'],
                ['column' => 'name', 'label' => 'Nama Anak', 'source' => 'nama_anak'],
                ['column' => 'date_of_birth', 'label' => 'Tanggal Lahir', 'source' => 'tanggal_lahir_anak'],
                ['column' => 'place_of_birth', 'label' => 'Tempat Lahir', 'source' => 'tempat_lahir_anak'],
                ['column' => 'gender', 'label' => 'Jenis Kelamin', 'source' => 'jenis_kelamin_anak'],
            ],
        ]);
        $letter = Letter::factory()->approved()->create([
            'village_id' => $this->village->id,
            'letter_type_id' => $letterType->id,
            'citizen_id' => $this->applicant['citizen']->id,
            'submitted_by' => $this->applicant['user']->id,
            'payload' => [
                'nama_anak' => 'Anak Baru',
                'tanggal_lahir_anak' => '2026-09-30',
                'tempat_lahir_anak' => 'Pangandaran',
                'jenis_kelamin_anak' => 'P',
            ],
        ]);

        // NIK belum ada di usulan warga: wajib diisi Kasi/Kaur.
        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letter->id}/fulfillment")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['values.nik']);

        $this->actingAs($this->kasi['user'])
            ->postJson("/api/letters/{$letter->id}/fulfillment", [
                'values' => ['nik' => '3207010101260001'],
            ])
            ->assertOk();

        $child = Citizen::query()->where('nik_hash', hash('sha256', '3207010101260001'))->firstOrFail();
        $this->assertSame('Anak Baru', $child->name);
        $this->assertSame($this->applicant['citizen']->rt_id, $child->rt_id);
        $this->assertSame($this->applicant['citizen']->address, $child->address);
        $this->assertSame($this->village->id, $child->village_id);

        $letter->refresh();
        $this->assertSame($child->id, $letter->fulfillment['citizen_id']);
        $this->assertSame('************0001', $letter->fulfillment['changes']['nik']['new']);
    }

    public function test_kasi_is_told_when_an_approved_letter_needs_a_data_action(): void
    {
        ['rt' => $rt] = $this->makeArea($this->village);
        $applicant = $this->makeCitizenAccount($this->village, $rt);
        $rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $kades = $this->makeOfficialUser('kepala_desa', $this->village);
        $letterType = $this->updateLetterType();

        $letterId = $this->actingAs($applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $letterType->id,
                'purpose' => 'Perbaikan nama',
                'payload' => ['nama_benar' => 'Nama Benar'],
            ])
            ->assertCreated()
            ->json('data.id');
        $this->actingAs($rtApprover['user'])
            ->patchJson("/api/rt/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();
        $this->actingAs($kades['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();

        Notification::assertSentTo(
            $this->kasi['user'],
            LetterStatusNotification::class,
            fn (LetterStatusNotification $n): bool => $n->toArray($this->kasi['user'])['context']['status'] === 'letter_needs_fulfillment',
        );
    }

    private function updateLetterType(): LetterType
    {
        return LetterType::factory()->create([
            'flow_id' => $this->makeDefaultFlow()->id,
            'assigned_role' => 'kasi_pelayanan',
            'data_action' => 'update_citizen',
            'form_fields' => [
                ['name' => 'nama_benar', 'label' => 'Nama yang Benar', 'type' => 'text', 'required' => true],
            ],
            'data_fields' => [
                ['column' => 'name', 'label' => 'Nama', 'source' => 'nama_benar'],
                ['column' => 'place_of_birth', 'label' => 'Tempat Lahir'],
                // Kolom di luar daftar yang diizinkan diabaikan.
                ['column' => 'nik', 'label' => 'NIK'],
            ],
        ]);
    }

    private function approvedUpdateLetter(array $payload, array $attributes = []): Letter
    {
        return Letter::factory()->approved()->create([
            'village_id' => $this->village->id,
            'letter_type_id' => $this->updateLetterType()->id,
            'citizen_id' => $this->applicant['citizen']->id,
            'submitted_by' => $this->applicant['user']->id,
            'payload' => $payload,
            ...$attributes,
        ]);
    }
}
