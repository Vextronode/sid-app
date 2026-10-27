<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Letter;
use App\Models\SignatureBlock;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Tombol "lihat" NIK / No. KK: pengelola data penduduk desa melihat semua
 * warga desanya, warga hanya dirinya dan KK-nya; pembukaan data orang lain
 * dicatat. Daftar blokir TTD/saksi dapat ditambah lewat NIK.
 */
class IdentityRevealTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private Citizen $spouse;

    private Citizen $neighbour;

    private Family $family;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($this->village);
        $this->family = Family::factory()->create(['village_id' => $this->village->id, 'no_kk' => '3218010101900001']);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', ['family_id' => $this->family->id, 'nik' => '3207010101800001']);
        $this->spouse = Citizen::factory()->create(['village_id' => $this->village->id, 'family_id' => $this->family->id, 'nik' => '3207010101800002']);
        $this->neighbour = Citizen::factory()->create(['village_id' => $this->village->id, 'nik' => '3207010101800003', 'name' => 'Tetangga']);
    }

    public function test_population_staff_see_any_citizen_of_their_village_and_the_view_is_logged(): void
    {
        $kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village);

        $this->actingAs($kasi['user'])
            ->getJson("/api/citizens/{$this->spouse->id}/identity")
            ->assertOk()
            ->assertJsonPath('data', ['nik' => '3207010101800002', 'no_kk' => '3218010101900001']);
        $this->actingAs($kasi['user'])
            ->getJson("/api/families/{$this->family->id}/identity")
            ->assertJsonPath('data.no_kk', '3218010101900001');

        $this->assertSame(2, Activity::query()->where('event', 'identity_viewed')->where('causer_id', $kasi['user']->id)->count());

        // Pengelola desa lain tidak dapat melihat.
        $other = $this->makeOfficialUser('kasi_pemerintahan', Village::factory()->create());
        $this->actingAs($other['user'])->getJson("/api/citizens/{$this->spouse->id}/identity")->assertForbidden();
    }

    public function test_a_resident_only_sees_their_own_family(): void
    {
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/citizens/{$this->spouse->id}/identity")
            ->assertOk()
            ->assertJsonPath('data.nik', '3207010101800002');
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/families/{$this->family->id}/identity")
            ->assertJsonPath('data.no_kk', '3218010101900001');
        $this->actingAs($this->applicant['user'])
            ->getJson("/api/citizens/{$this->neighbour->id}/identity")
            ->assertForbidden();
    }

    public function test_anyone_who_can_view_a_letter_sees_its_applicant_nik(): void
    {
        $letter = Letter::factory()->create([
            'village_id' => $this->village->id,
            'submitted_by' => $this->applicant['user']->id,
            'citizen_id' => $this->applicant['citizen']->id,
            'applicant_nik' => '3207010101800001',
        ]);

        $this->actingAs($this->applicant['user'])
            ->getJson("/api/letters/{$letter->id}/applicant-identity")
            ->assertOk()
            ->assertJsonPath('data.nik', '3207010101800001');

        $stranger = $this->makeCitizenAccount($this->village, null, 'warga');
        $this->actingAs($stranger['user'])->getJson("/api/letters/{$letter->id}/applicant-identity")->assertForbidden();
    }

    public function test_resident_blocks_another_resident_by_nik(): void
    {
        $other = $this->makeCitizenAccount($this->village, null, 'warga', ['nik' => '3207010101800009', 'name' => 'Pemohon Iseng']);

        $this->actingAs($this->applicant['user'])
            ->postJson('/api/signature-blocks', ['nik' => '3207010101800009'])
            ->assertCreated()
            ->assertJsonPath('data.blocked_user_name', $other['user']->name)
            ->assertJsonPath('data.blocked_nik_masked', '************0009');
        $this->assertTrue(SignatureBlock::query()->where('user_id', $this->applicant['user']->id)->where('blocked_user_id', $other['user']->id)->exists());

        $this->actingAs($this->applicant['user'])->postJson('/api/signature-blocks', ['nik' => '3207010101800003'])
            ->assertJsonValidationErrors('nik');
        $this->actingAs($this->applicant['user'])->postJson('/api/signature-blocks', ['nik' => '3207010101800001'])
            ->assertJsonValidationErrors('nik');
        $this->actingAs($this->applicant['user'])
            ->getJson('/api/signature-blocks')
            ->assertJsonCount(1, 'data');
    }
}
