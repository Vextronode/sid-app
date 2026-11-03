<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Hamlet;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Data Penduduk khusus-baca untuk RT, RW, Kadus, Kepala Desa, dan
 * Sekretaris Desa (PopulationScope):
 *
 *   Dusun A ── RW 1 ── RT 1 (Ani), RT 2 (Budi)
 *           └─ RW 2 ── RT 3 (Citra)
 *   Dusun B ── RW 3 ── RT 4 (Dodi)
 */
class PopulationReadScopeTest extends TestCase
{
    use RefreshDatabase;

    private Village $village;

    /** @var array<string, Hamlet> */
    private array $hamlets = [];

    /** @var array<int, Rw> */
    private array $rws = [];

    /** @var array<int, Rt> */
    private array $rts = [];

    /** @var array<int, Citizen> */
    private array $citizens = [];

    /** @var array<int, Family> */
    private array $families = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        $this->hamlets = [
            'A' => Hamlet::factory()->create(['village_id' => $this->village->id, 'name' => 'Dusun A']),
            'B' => Hamlet::factory()->create(['village_id' => $this->village->id, 'name' => 'Dusun B']),
        ];
        foreach ([1 => 'A', 2 => 'A', 3 => 'B'] as $number => $hamlet) {
            $this->rws[$number] = Rw::factory()->create([
                'hamlet_id' => $this->hamlets[$hamlet]->id,
                'village_id' => $this->village->id,
                'number' => (string) $number,
            ]);
        }

        $names = [1 => 'Ani', 2 => 'Budi', 3 => 'Citra', 4 => 'Dodi'];
        foreach ([1 => 1, 2 => 1, 3 => 2, 4 => 3] as $number => $rw) {
            $this->rts[$number] = Rt::factory()->create([
                'rw_id' => $this->rws[$rw]->id,
                'village_id' => $this->village->id,
                'number' => (string) $number,
            ]);
            $area = [
                'village_id' => $this->village->id,
                'rt_id' => $this->rts[$number]->id,
                'rw_id' => $this->rws[$rw]->id,
                'hamlet_id' => $this->rws[$rw]->hamlet_id,
            ];
            $this->families[$number] = Family::factory()->create($area);
            $this->citizens[$number] = Citizen::factory()->create([
                ...collect($area)->except('rw_id')->all(),
                'name' => $names[$number],
                'family_id' => $this->families[$number]->id,
            ]);
        }
    }

    /**
     * @param  array<string, int>  $area
     */
    private function reader(string $role, array $area = []): User
    {
        $user = User::factory()->create([
            'role' => $role,
            'village_id' => $this->village->id,
        ]);

        Official::factory()->forUser($user)->position($role)->create([
            'citizen_id' => $this->citizens[1]->id,
            ...$area,
        ]);

        return $user->fresh();
    }

    /**
     * @return list<string>
     */
    private function citizenNames(User $user, string $query = ''): array
    {
        return collect($this->actingAs($user)->getJson('/api/citizens'.$query)->assertOk()->json('data'))
            ->pluck('name')
            ->sort()
            ->values()
            ->all();
    }

    /**
     * @return list<string>
     */
    private function familyIds(User $user, string $query = ''): array
    {
        return collect($this->actingAs($user)->getJson('/api/families'.$query)->assertOk()->json('data'))
            ->pluck('id')
            ->sort()
            ->values()
            ->all();
    }

    /**
     * @param  list<int>  $numbers
     * @return list<string>
     */
    private function familyIdsOf(array $numbers): array
    {
        return collect($numbers)->map(fn (int $number) => $this->families[$number]->id)->sort()->values()->all();
    }

    #[Test]
    public function rt_reads_only_citizens_and_families_in_own_rt(): void
    {
        $rt = $this->reader('rt', ['rt_id' => $this->rts[1]->id]);

        $this->assertSame(['Ani'], $this->citizenNames($rt));
        $this->assertSame($this->familyIdsOf([1]), $this->familyIds($rt));

        // Filter ke RT lain tidak membuka data di luar cakupan.
        $this->assertSame([], $this->citizenNames($rt, '?rt_id='.$this->rts[2]->id));
    }

    #[Test]
    public function different_rt_sees_different_citizens(): void
    {
        $rt = $this->reader('rt', ['rt_id' => $this->rts[2]->id]);

        $this->assertSame(['Budi'], $this->citizenNames($rt));
    }

    #[Test]
    public function rw_reads_all_rts_under_own_rw_and_can_filter_by_rt(): void
    {
        $rw = $this->reader('rw', ['rw_id' => $this->rws[1]->id]);

        $this->assertSame(['Ani', 'Budi'], $this->citizenNames($rw));
        $this->assertSame($this->familyIdsOf([1, 2]), $this->familyIds($rw));
        $this->assertSame(['Budi'], $this->citizenNames($rw, '?rt_id='.$this->rts[2]->id));
        $this->assertSame([], $this->citizenNames($rw, '?rt_id='.$this->rts[3]->id));
    }

    #[Test]
    public function kadus_reads_all_rws_and_rts_in_own_hamlet_and_can_filter(): void
    {
        $kadus = $this->reader('kadus', ['hamlet_id' => $this->hamlets['A']->id]);

        $this->assertSame(['Ani', 'Budi', 'Citra'], $this->citizenNames($kadus));
        $this->assertSame($this->familyIdsOf([1, 2, 3]), $this->familyIds($kadus));
        $this->assertSame(['Citra'], $this->citizenNames($kadus, '?rw_id='.$this->rws[2]->id));
        $this->assertSame(['Budi'], $this->citizenNames($kadus, '?rt_id='.$this->rts[2]->id));
        $this->assertSame([], $this->citizenNames($kadus, '?rw_id='.$this->rws[3]->id));
    }

    #[DataProvider('villageWideReaders')]
    #[Test]
    public function kades_and_sekdes_read_the_whole_village(string $role): void
    {
        $reader = $this->reader($role);

        $this->assertSame(['Ani', 'Budi', 'Citra', 'Dodi'], $this->citizenNames($reader));
        $this->assertSame($this->familyIdsOf([1, 2, 3, 4]), $this->familyIds($reader));
        $this->assertSame(['Dodi'], $this->citizenNames($reader, '?hamlet_id='.$this->hamlets['B']->id));
    }

    public static function villageWideReaders(): array
    {
        return [['kepala_desa'], ['sekretaris_desa']];
    }

    #[Test]
    public function region_options_are_limited_to_the_reader_area(): void
    {
        $rw = $this->reader('rw', ['rw_id' => $this->rws[1]->id]);
        $kadus = $this->reader('kadus', ['hamlet_id' => $this->hamlets['A']->id]);
        $kades = $this->reader('kepala_desa');

        $numbers = fn (User $user, string $path) => collect($this->actingAs($user)->getJson($path)->assertOk()->json('data'))
            ->pluck('number')->map(fn ($number) => (string) $number)->sort()->values()->all();

        $this->assertSame(['1', '2'], $numbers($rw, '/api/rts'));
        $this->assertSame(['1'], $numbers($rw, '/api/rws'));
        $this->assertSame(['1', '2', '3'], $numbers($kadus, '/api/rts'));
        $this->assertSame(['1', '2'], $numbers($kadus, '/api/rws'));
        $this->assertCount(1, $this->actingAs($kadus)->getJson('/api/hamlets')->assertOk()->json('data'));
        $this->assertSame(['1', '2', '3', '4'], $numbers($kades, '/api/rts'));
    }

    #[Test]
    public function family_detail_and_options_follow_the_scope(): void
    {
        $rt = $this->reader('rt', ['rt_id' => $this->rts[1]->id]);

        $this->actingAs($rt)->getJson('/api/families/'.$this->families[1]->id)->assertOk();
        $this->actingAs($rt)->getJson('/api/families/'.$this->families[2]->id)->assertNotFound();
        $this->actingAs($rt)->getJson('/api/families/options')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $this->families[1]->id);
    }

    #[Test]
    public function identity_reveal_follows_the_scope(): void
    {
        $rw = $this->reader('rw', ['rw_id' => $this->rws[1]->id]);

        $this->actingAs($rw)->getJson('/api/citizens/'.$this->citizens[2]->id.'/identity')->assertOk();
        $this->actingAs($rw)->getJson('/api/citizens/'.$this->citizens[3]->id.'/identity')->assertForbidden();
        $this->actingAs($rw)->getJson('/api/families/'.$this->families[2]->id.'/identity')->assertOk();
        $this->actingAs($rw)->getJson('/api/families/'.$this->families[4]->id.'/identity')->assertForbidden();
    }

    #[DataProvider('regionalAndVillageReaders')]
    #[Test]
    public function readers_cannot_write_population_data(string $role, array $area): void
    {
        $reader = $this->reader($role, $area);
        $citizen = $this->citizens[1];
        $family = $this->families[1];

        $this->actingAs($reader)->postJson('/api/citizens', [])->assertForbidden();
        $this->actingAs($reader)->patchJson("/api/citizens/{$citizen->id}", ['name' => 'Diubah'])->assertForbidden();
        $this->actingAs($reader)->deleteJson("/api/citizens/{$citizen->id}")->assertForbidden();
        $this->actingAs($reader)->postJson('/api/families', [])->assertForbidden();
        $this->actingAs($reader)->patchJson("/api/families/{$family->id}", ['family_address' => 'Diubah'])->assertForbidden();
        $this->actingAs($reader)->deleteJson("/api/families/{$family->id}")->assertForbidden();
    }

    public static function regionalAndVillageReaders(): array
    {
        return [
            'rt' => ['rt', []],
            'rw' => ['rw', []],
            'kadus' => ['kadus', []],
            'kepala_desa' => ['kepala_desa', []],
            'sekretaris_desa' => ['sekretaris_desa', []],
        ];
    }

    #[Test]
    public function regional_reader_without_area_assignment_is_forbidden(): void
    {
        $rt = $this->reader('rt');

        $this->actingAs($rt)->getJson('/api/citizens')->assertForbidden();
        $this->actingAs($rt)->getJson('/api/families')->assertForbidden();
    }
}
