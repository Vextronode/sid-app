<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\FamilySocioeconomic;
use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Peta hak akses role x endpoint untuk Data Penduduk dan turunannya.
 *
 * Satu tempat yang menyatakan siapa boleh apa, supaya route, FormRequest,
 * policy, dan service tidak lagi bisa berbeda diam-diam (temuan #4 dan #8:
 * sosial ekonomi hanya bisa dipakai Staf, statistik menolak Kades/Kadus).
 * "Boleh" = bukan 403 dan bukan error server; "tidak boleh" = 403.
 */
class AccessMatrixTest extends TestCase
{
    use RefreshDatabase;

    private const READERS = [
        'staf_sid', 'kasi_pemerintahan', 'kaur_tu_umum', 'kepala_desa', 'sekretaris_desa', 'kadus', 'rw', 'rt',
    ];

    public function test_each_role_reaches_exactly_the_endpoints_it_is_allowed_to(): void
    {
        $village = Village::factory()->create();
        $hamlet = Hamlet::factory()->create(['village_id' => $village->id]);
        $rw = Rw::factory()->create(['hamlet_id' => $hamlet->id]);
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $family = Family::factory()->create(['village_id' => $village->id, 'rt_id' => $rt->id]);
        Citizen::factory()->create(['village_id' => $village->id, 'rt_id' => $rt->id, 'family_id' => $family->id]);
        FamilySocioeconomic::query()->create(['family_id' => $family->id, 'dependents_count' => 2]);

        $users = [
            'warga' => User::factory()->create([
                'role' => 'warga',
                'village_id' => $village->id,
                'citizen_id' => Citizen::factory()->create(['village_id' => $village->id, 'rt_id' => $rt->id])->id,
            ]),
            'staf_sid' => $this->makeUserWithOfficialAssignment('staf_sid', 'staf_sid', $village->id),
            'kasi_pemerintahan' => $this->makeUserWithOfficialAssignment('kasi_pemerintahan', 'kasi_pemerintahan', $village->id),
            'kaur_tu_umum' => $this->makeUserWithOfficialAssignment('kaur_tu_umum', 'kaur_tu_umum', $village->id),
            'kepala_desa' => $this->makeUserWithOfficialAssignment('kepala_desa', 'kepala_desa', $village->id),
            'sekretaris_desa' => $this->makeUserWithOfficialAssignment('sekretaris_desa', 'sekretaris_desa', $village->id),
            'kadus' => $this->makeUserWithOfficialAssignment('kadus', 'kadus', $village->id, ['hamlet_id' => $hamlet->id]),
            'rw' => $this->makeUserWithOfficialAssignment('rw', 'rw', $village->id, ['rw_id' => $rw->id]),
            'rt' => $this->makeUserWithOfficialAssignment('rt', 'rt', $village->id, ['rt_id' => $rt->id]),
        ];

        $matrix = [
            'lihat daftar warga' => ['get', '/api/citizens', [], self::READERS],
            'lihat daftar KK' => ['get', '/api/families', [], self::READERS],
            'tambah warga' => ['post', '/api/citizens', [], ['staf_sid', 'kasi_pemerintahan']],
            'lihat survei sosio-ekonomi' => ['get', "/api/families/{$family->id}/socioeconomic", [], ['staf_sid', 'kasi_pemerintahan', 'kaur_tu_umum']],
            'isi survei sosio-ekonomi' => ['put', "/api/families/{$family->id}/socioeconomic", ['dependents_count' => 3], ['staf_sid', 'kasi_pemerintahan']],
            'statistik jenis kelamin' => ['get', '/api/dashboard/gender-stats', [], self::READERS],
            'log aktivitas penduduk' => ['get', '/api/activity-logs/population', [], ['staf_sid']],
            'log aktivitas lainnya' => ['get', '/api/activity-logs/others', [], ['staf_sid']],
        ];

        $mismatches = [];

        foreach ($matrix as $label => [$method, $uri, $payload, $allowed]) {
            foreach ($users as $role => $user) {
                $status = $this->actingAs($user)->json($method, $uri, $payload)->getStatusCode();
                $expected = in_array($role, $allowed, true) ? 'boleh' : 'tidak boleh';
                $actual = $status === 403 ? 'tidak boleh' : ($status >= 500 ? "error {$status}" : 'boleh');

                if ($expected !== $actual) {
                    $mismatches[] = "{$label} / {$role}: diharapkan {$expected}, dapat HTTP {$status}";
                }
            }
        }

        $this->assertSame([], $mismatches);
    }
}
