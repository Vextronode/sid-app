<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Rt;
use App\Models\Village;
use Database\Seeders\ApprovalFlowSeeder;
use Database\Seeders\ServiceLetterTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Isian village_area: pilihan Dusun -> RW -> RT diambil dari data wilayah
 * desa (GET /api/village-areas), dan pengajuan hanya menerima RT aktif desa
 * ini; labelnya disimpan siap cetak.
 */
class VillageAreaFieldTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private Rt $budiasih;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->village = Village::factory()->create();
        $this->seed([ApprovalFlowSeeder::class, ServiceLetterTypeSeeder::class]);
        $this->budiasih = $this->makeNamedArea($this->village, 'Budiasih', '19', '2');
        $this->applicant = $this->makeCitizenAccount($this->village, $this->budiasih);
    }

    public function test_any_role_lists_active_hamlets_with_their_rws_and_rts(): void
    {
        $inactive = $this->makeNamedArea($this->village, 'Lama', '1', '1');
        $inactive->rw->hamlet->update(['is_active' => false]);
        $this->makeNamedArea(Village::factory()->create(), 'Desa Lain', '1', '1');

        $this->actingAs($this->applicant['user'])
            ->getJson('/api/village-areas')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Budiasih')
            ->assertJsonPath('data.0.rws.0.number', '19')
            ->assertJsonPath('data.0.rws.0.rts.0.id', $this->budiasih->id)
            ->assertJsonPath('data.0.rws.0.rts.0.number', '2');
    }

    public function test_submission_stores_the_printable_labels_of_the_chosen_rt(): void
    {
        $letterId = $this->submit($this->budiasih->id)->assertCreated()->json('data.id');

        $payload = Letter::query()->findOrFail($letterId)->payload;
        $this->assertSame($this->budiasih->id, $payload['alamat']);
        $this->assertSame('Budiasih', $payload['alamat_dusun']);
        $this->assertSame('019', $payload['alamat_rw']);
        $this->assertSame('002', $payload['alamat_rt']);
    }

    public function test_rt_outside_the_village_or_inactive_is_rejected(): void
    {
        $otherVillage = $this->makeNamedArea(Village::factory()->create(), 'Desa Lain', '1', '1');
        $inactive = $this->makeNamedArea($this->village, 'Budiasih', '20', '3');
        $inactive->update(['is_active' => false]);

        $this->submit($otherVillage->id)->assertUnprocessable()->assertJsonValidationErrors('payload.alamat');
        $this->submit($inactive->id)->assertUnprocessable()->assertJsonValidationErrors('payload.alamat');
    }

    private function submit(int $rtId): TestResponse
    {
        return $this->actingAs($this->applicant['user'])->postJson('/api/letters', [
            'letter_type_id' => LetterType::query()->where('code', 'F01')->value('id'),
            'payload' => [
                'nama_lengkap' => 'Orang Tanpa Dokumen',
                'tempat_lahir' => 'Ciamis',
                'tanggal_lahir' => '2000-01-01',
                'jenis_kelamin' => 'L',
                'nama_ibu' => 'Ibu',
                'pendidikan_terakhir' => 'sd',
                'alamat' => $rtId,
            ],
        ]);
    }
}
