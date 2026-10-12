<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

class BackfillLetterSnapshotsTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    public function test_command_freezes_approved_letters_that_have_no_snapshot(): void
    {
        $village = Village::factory()->create();
        $kades = $this->makeOfficialUser('kepala_desa', $village);
        $letterType = LetterType::factory()->create([
            'flow_id' => $this->makeDefaultFlow()->id,
            'template' => 'Surat {{ applicant_name }}',
        ]);
        $approved = Letter::factory()->approved()->create([
            'village_id' => $village->id,
            'letter_type_id' => $letterType->id,
            'processed_at' => now()->setDate(2026, 8, 17),
        ]);
        $pending = Letter::factory()->create([
            'village_id' => $village->id,
            'letter_type_id' => $letterType->id,
        ]);
        $withoutKades = Letter::factory()->approved()->create([
            'village_id' => Village::factory()->create()->id,
            'letter_type_id' => $letterType->id,
        ]);

        $this->artisan('letters:backfill-snapshots')
            ->expectsOutputToContain('Snapshot dibuat: 1. Dilewati (belum ada Kepala Desa aktif): 1.')
            ->assertSuccessful();

        $approved->refresh();
        $this->assertSame($kades['official']->id, $approved->signed_by_official_id);
        $this->assertSame('Surat {{ applicant_name }}', $approved->snapshot['template']);
        // Tanggal surat mengikuti tanggal persetujuan, bukan tanggal backfill.
        $this->assertSame('17 Agustus 2026', $approved->snapshot['issued_at']);
        $this->assertNull($pending->fresh()->snapshot);
        $this->assertNull($withoutKades->fresh()->snapshot);

        // Menjalankan ulang tidak mengubah snapshot yang sudah ada.
        $before = $approved->snapshot;
        $this->artisan('letters:backfill-snapshots')->assertSuccessful();
        $this->assertSame($before, $approved->fresh()->snapshot);
    }
}
