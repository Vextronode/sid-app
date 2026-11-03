<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Village;
use App\Services\LetterSnapshotService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * B2. Isian form (payload), data render yang dibekukan (snapshot), dan
 * hasil Terapkan (fulfillment) memuat NIK/No KK pihak lain, jadi tersimpan
 * sebagai ciphertext. Render PDF, Terapkan, dan ganti saksi diuji di test
 * masing-masing (SeededLetterRenderingTest, LetterFulfillmentTest,
 * WitnessReplacementTest).
 */
class LetterJsonEncryptionTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private const FATHER_NIK = '3207010101700001';

    private const FAMILY_NUMBER = '3207010101700099';

    public function test_letter_json_columns_are_stored_as_ciphertext(): void
    {
        $letter = Letter::factory()->create([
            'payload' => ['nik_ayah' => self::FATHER_NIK, 'kk_saksi_1' => self::FAMILY_NUMBER],
            'snapshot' => ['applicant' => ['family_members' => [['nama' => 'Ayah', 'nik' => self::FATHER_NIK]]]],
            'fulfillment' => ['action' => 'update_citizen', 'changes' => ['name' => ['old' => 'Lama', 'new' => 'Baru']]],
        ]);
        $raw = (array) DB::table('letters')->where('id', $letter->id)->first();

        foreach (['payload', 'snapshot', 'fulfillment'] as $column) {
            // Ciphertext, bukan JSON yang bisa dibaca dari dump database.
            $this->assertNull(json_decode($raw[$column], true), "letters.{$column}");
            $this->assertStringNotContainsString(self::FATHER_NIK, $raw[$column], "letters.{$column}");
            $this->assertStringNotContainsString('family_members', $raw[$column], "letters.{$column}");
            $this->assertStringNotContainsString('update_citizen', $raw[$column], "letters.{$column}");
        }

        $fresh = $letter->fresh();
        $this->assertSame(self::FATHER_NIK, $fresh->payload['nik_ayah']);
        $this->assertSame(self::FATHER_NIK, $fresh->snapshot['applicant']['family_members'][0]['nik']);
        $this->assertSame('Baru', $fresh->fulfillment['changes']['name']['new']);
    }

    public function test_submitted_payload_and_captured_snapshot_do_not_store_niks_in_plaintext(): void
    {
        Notification::fake();
        $village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($village);
        $applicant = $this->makeCitizenAccount($village, $rt);
        $this->makeOfficialUser('rt', $village, ['rt_id' => $rt->id]);
        $this->makeOfficialUser('kepala_desa', $village);
        $letterType = LetterType::factory()->create([
            'flow_id' => $this->makeDefaultFlow()->id,
            'template' => 'Surat {{ applicant_name }} ayah {{ nik_ayah }}',
            'form_fields' => [
                ['name' => 'nik_ayah', 'label' => 'NIK Ayah', 'type' => 'nik', 'required' => true],
            ],
        ]);

        $letterId = $this->actingAs($applicant['user'])
            ->postJson('/api/letters', ['letter_type_id' => $letterType->id, 'payload' => ['nik_ayah' => self::FATHER_NIK]])
            ->assertCreated()
            ->json('data.id');

        $letter = Letter::query()->findOrFail($letterId);
        app(LetterSnapshotService::class)->captureOnFinalApproval($letter);
        $raw = (array) DB::table('letters')->where('id', $letterId)->first();

        $this->assertSame(self::FATHER_NIK, $letter->fresh()->payload['nik_ayah']);
        $this->assertStringNotContainsString(self::FATHER_NIK, $raw['payload']);
        $this->assertNotNull($raw['snapshot']);
        $this->assertStringNotContainsString($applicant['citizen']->nik, $raw['snapshot']);
        $this->assertSame($applicant['citizen']->nik, $letter->fresh()->snapshot['applicant']['family_members'][0]['nik']);
    }
}
