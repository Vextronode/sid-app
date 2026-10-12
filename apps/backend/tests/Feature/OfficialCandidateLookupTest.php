<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\OfficialPositionType;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

class OfficialCandidateLookupTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private const NIK = '3207010101900001';

    public function test_petugas_finds_an_eligible_candidate_by_nik_and_can_rotate_to_them(): void
    {
        $village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($village);
        $petugas = $this->makeOfficialUser('petugas_desa', $village);
        $currentRt = $this->makeOfficialUser('rt', $village, ['rt_id' => $rt->id]);
        $candidate = $this->makeCitizenAccount($village, $rt, 'warga', ['nik' => self::NIK]);

        $userId = $this->actingAs($petugas['user'])
            ->postJson('/api/officials/candidates/lookup', ['nik' => self::NIK])
            ->assertOk()
            ->assertJsonPath('data.name', $candidate['citizen']->name)
            ->assertJsonPath('data.username', $candidate['user']->username)
            ->assertJsonPath('data.eligible', true)
            ->assertJsonPath('data.reason', null)
            ->json('data.user_id');

        $this->assertSame($candidate['user']->id, $userId);

        Storage::fake('public');
        $this->actingAs($petugas['user'])
            ->post("/api/officials/{$currentRt['official']->id}/rotate", [
                'user_id' => $userId,
                'started_at' => now()->toDateString(),
                'photo' => UploadedFile::fake()->image('foto.jpg'),
            ], ['Accept' => 'application/json'])
            ->assertOk();

        $this->assertSame('rt', $candidate['user']->fresh()->role);
        $this->assertSame('warga', $currentRt['user']->fresh()->role);
    }

    public function test_lookup_explains_why_a_citizen_cannot_be_appointed(): void
    {
        $village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($village);
        $petugas = $this->makeOfficialUser('petugas_desa', $village);
        $serving = $this->makeOfficialUser('rt', $village, ['rt_id' => $rt->id]);
        $serving['citizen']->update(['nik' => '3207010101900002']);
        $inactive = $this->makeCitizenAccount($village, $rt, 'warga', ['nik' => '3207010101900003']);
        $inactive['user']->update(['is_active' => false]);
        $withoutAccount = Citizen::factory()->create([
            'village_id' => $village->id,
            'nik' => '3207010101900004',
        ]);

        $lookup = fn (string $nik) => $this->actingAs($petugas['user'])
            ->postJson('/api/officials/candidates/lookup', ['nik' => $nik]);

        $lookup('3207010101900002')->assertOk()
            ->assertJsonPath('data.eligible', false)
            ->assertJsonPath('data.reason', 'Warga ini sedang menjabat. Akhiri jabatannya lebih dulu.');
        $lookup('3207010101900003')->assertOk()
            ->assertJsonPath('data.eligible', false)
            ->assertJsonPath('data.reason', 'Akun warga ini sedang nonaktif.');
        $lookup('3207010101900004')->assertOk()
            ->assertJsonPath('data.name', $withoutAccount->name)
            ->assertJsonPath('data.user_id', null)
            ->assertJsonPath('data.eligible', false);
        // Jabatan tanpa akun tidak mensyaratkan akun, tetapi tetap menolak
        // warga yang sedang menjabat.
        OfficialPositionType::factory()->code('kaur_keuangan')->create(['village_id' => $village->id]);
        $this->actingAs($petugas['user'])
            ->postJson('/api/officials/candidates/lookup', ['nik' => '3207010101900004', 'position' => 'kaur_keuangan'])
            ->assertOk()
            ->assertJsonPath('data.citizen_id', $withoutAccount->id)
            ->assertJsonPath('data.eligible', true);
        $this->actingAs($petugas['user'])
            ->postJson('/api/officials/candidates/lookup', ['nik' => '3207010101900002', 'position' => 'kaur_keuangan'])
            ->assertOk()
            ->assertJsonPath('data.eligible', false);
        $lookup('3299999999999999')->assertNotFound();
        $lookup('123')->assertStatus(422)->assertJsonValidationErrors(['nik']);
    }

    public function test_lookup_is_limited_to_petugas_desa_and_their_own_village(): void
    {
        $village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($village);
        $this->makeCitizenAccount($village, $rt, 'warga', ['nik' => self::NIK]);
        $rtOfficial = $this->makeOfficialUser('rt', $village, ['rt_id' => $rt->id]);
        $foreignPetugas = $this->makeOfficialUser('petugas_desa', Village::factory()->create());

        $this->actingAs($rtOfficial['user'])
            ->postJson('/api/officials/candidates/lookup', ['nik' => self::NIK])
            ->assertForbidden();
        // Petugas desa lain tidak dapat menemukan warga desa ini.
        $this->actingAs($foreignPetugas['user'])
            ->postJson('/api/officials/candidates/lookup', ['nik' => self::NIK])
            ->assertNotFound();
    }
}
