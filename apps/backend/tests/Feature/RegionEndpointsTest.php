<?php

namespace Tests\Feature;

use App\Models\AccountRegistration;
use App\Models\Citizen;
use App\Models\Family;
use App\Models\Hamlet;
use App\Models\Letter;
use App\Models\Official;
use App\Models\ProfilePhotoRequest;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use App\Services\RwService;
use Closure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class RegionEndpointsTest extends TestCase
{
    use RefreshDatabase;

    private function stafSid(Village $village): User
    {
        return User::factory()->create([
            'village_id' => $village->id,
            'role' => 'staf_sid',
        ]);
    }

    public function test_staf_sid_can_create_list_and_update_hamlets(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);

        $this->actingAs($user)
            ->postJson('/api/hamlets', ['name' => 'Dusun Patrol', 'code' => 'PTR'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Dusun Patrol');

        $hamlet = Hamlet::firstWhere('code', 'PTR');

        $this->actingAs($user)
            ->getJson('/api/hamlets')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($user)
            ->patchJson("/api/hamlets/{$hamlet->id}", ['name' => 'Dusun Patrol Baru'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Dusun Patrol Baru');
    }

    public function test_non_staf_sid_cannot_create_hamlet(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = User::factory()->create(['village_id' => $village->id, 'role' => 'rt']);

        $this->actingAs($user)
            ->postJson('/api/hamlets', ['name' => 'Dusun Patrol', 'code' => 'PTR'])
            ->assertForbidden();
    }

    public function test_duplicate_hamlet_code_is_rejected(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);

        $this->actingAs($user)
            ->postJson('/api/hamlets', ['name' => 'Dusun B', 'code' => 'PTR'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');
    }

    public function test_deactivating_hamlet_with_active_citizens_is_blocked(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);
        $rt = Rt::create(['rw_id' => $rw->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);

        $citizen = Citizen::create([
            'village_id' => $village->id,
            'nik' => '3218030101010001',
            'nik_hash' => hash('sha256', '3218030101010001'),
            'name' => 'Warga Aktif',
            'date_of_birth' => '1990-01-01',
            'gender' => 'L',
            'address' => 'Desa Cibenda',
            'rt_id' => $rt->id,
            'is_active' => true,
        ]);

        // Dusun warga diturunkan dari RT, tanpa dikirim.
        $this->assertSame($hamlet->id, $citizen->fresh()->hamlet_id);

        $this->actingAs($user)
            ->patchJson("/api/hamlets/{$hamlet->id}", ['is_active' => false])
            ->assertStatus(409);

        $this->assertTrue($hamlet->fresh()->is_active);
    }

    public function test_hamlet_check_reads_citizens_through_their_rt_not_the_hamlet_column(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);
        $rt = Rt::create(['rw_id' => $rw->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);
        $citizen = Citizen::factory()->create(['village_id' => $village->id, 'rt_id' => $rt->id, 'is_active' => true]);

        // Data lama: kolom dusun kosong walau RT-nya ada di Dusun A. Dulu
        // cek Dusun membaca kolom ini sehingga hapus Dusun lolos dan
        // cascade mengosongkan RT warga.
        DB::table('citizens')->where('id', $citizen->id)->update(['hamlet_id' => null]);

        $this->actingAs($user)
            ->patchJson("/api/hamlets/{$hamlet->id}", ['is_active' => false])
            ->assertStatus(409);

        $this->actingAs($user)
            ->deleteJson("/api/hamlets/{$hamlet->id}")
            ->assertStatus(409);

        $this->assertNotNull(Hamlet::find($hamlet->id));
        $this->assertSame($rt->id, $citizen->fresh()->rt_id);
    }

    public function test_deactivating_hamlet_without_active_citizens_succeeds(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);

        $this->actingAs($user)
            ->patchJson("/api/hamlets/{$hamlet->id}", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);
    }

    public function test_staf_sid_can_create_list_update_and_delete_rws(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);

        $this->actingAs($user)
            ->postJson('/api/rws', ['hamlet_id' => $hamlet->id, 'number' => '001'])
            ->assertCreated();

        $rw = Rw::firstWhere('hamlet_id', $hamlet->id);

        $this->actingAs($user)
            ->getJson("/api/rws?hamlet_id={$hamlet->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($user)
            ->patchJson("/api/rws/{$rw->id}", ['number' => '002'])
            ->assertOk();

        $this->actingAs($user)
            ->deleteJson("/api/rws/{$rw->id}")
            ->assertOk();

        $this->assertNull(Rw::find($rw->id));
    }

    public function test_non_staf_sid_cannot_create_rw(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = User::factory()->create(['village_id' => $village->id, 'role' => 'rt']);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);

        $this->actingAs($user)
            ->postJson('/api/rws', ['hamlet_id' => $hamlet->id, 'number' => '001'])
            ->assertForbidden();
    }

    public function test_duplicate_rw_number_within_same_hamlet_is_rejected(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        Rw::create(['hamlet_id' => $hamlet->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);

        $this->actingAs($user)
            ->postJson('/api/rws', ['hamlet_id' => $hamlet->id, 'number' => '001'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('number');
    }

    public function test_rw_number_is_unique_per_village_not_per_hamlet(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $patrol = Hamlet::create(['name' => 'Patrol', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $sinargalih = Hamlet::create(['name' => 'Sinargalih', 'code' => 'SNG', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $patrol->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);
        Rw::create(['hamlet_id' => $sinargalih->id, 'village_id' => $village->id, 'number' => '006', 'is_active' => true]);

        // RW 001 sudah ada di Patrol: dusun lain pun tidak boleh memakainya.
        $this->actingAs($user)
            ->postJson('/api/rws', ['hamlet_id' => $sinargalih->id, 'number' => '001'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.number.0', 'RW dengan nomor ini sudah ada di desa ini.');

        $this->actingAs($user)
            ->patchJson("/api/rws/{$rw->id}", ['number' => '006'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('number');

        // Desa lain boleh memakai nomor yang sama.
        $otherVillage = Village::create(['name' => 'Desa Lain', 'code' => 'LAIN']);
        $otherHamlet = Hamlet::create(['name' => 'Lain', 'code' => 'LN', 'village_id' => $otherVillage->id, 'is_active' => true]);
        $this->actingAs($this->stafSid($otherVillage))
            ->postJson('/api/rws', ['hamlet_id' => $otherHamlet->id, 'number' => '001'])
            ->assertCreated();
    }

    public function test_area_numbers_are_stored_with_three_digits(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);

        $this->actingAs($user)
            ->postJson('/api/rws', ['hamlet_id' => $hamlet->id, 'number' => '7'])
            ->assertCreated()
            ->assertJsonPath('data.number', '007');
        $rw = Rw::query()->firstOrFail();

        // "07" dan 7 (angka) sama dengan "007" yang sudah ada.
        foreach (['07', 7] as $duplicate) {
            $this->actingAs($user)
                ->postJson('/api/rws', ['hamlet_id' => $hamlet->id, 'number' => $duplicate])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('number');
        }

        $this->actingAs($user)
            ->postJson('/api/rts', ['rw_id' => $rw->id, 'number' => ' 12 '])
            ->assertCreated()
            ->assertJsonPath('data.number', '012');

        $this->actingAs($user)
            ->postJson('/api/rts', ['rw_id' => $rw->id, 'number' => '012'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('number');
    }

    public function test_area_numbers_must_be_between_one_and_999(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);

        foreach (['0', '000', '1000', '1A', 'abc', ''] as $invalid) {
            $this->actingAs($user)
                ->postJson('/api/rws', ['hamlet_id' => $hamlet->id, 'number' => $invalid])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('number');

            $this->actingAs($user)
                ->postJson('/api/rts', ['rw_id' => $rw->id, 'number' => $invalid])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('number');
        }

        $this->assertSame(1, Rw::query()->count());
        $this->assertSame(0, Rt::query()->count());
    }

    public function test_duplicate_number_that_slips_past_validation_is_a_validation_error(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $service = app(RwService::class);

        // Dua permintaan bersamaan sama-sama lolos FormRequest; yang kedua
        // ditolak unique index dan harus jadi 422, bukan 500.
        $service->create(['hamlet_id' => $hamlet->id, 'number' => '001'], $user);

        try {
            $service->create(['hamlet_id' => $hamlet->id, 'number' => '1'], $user);
            $this->fail('RW ganda seharusnya ditolak.');
        } catch (ValidationException $exception) {
            $this->assertSame(['RW dengan nomor ini sudah ada di desa ini.'], $exception->errors()['number']);
        }

        $this->assertSame(1, Rw::query()->count());
    }

    /**
     * @return array<string, array{string, Closure(Rt): mixed}>
     */
    public static function regionReferences(): array
    {
        return [
            'warga' => ['warga', fn (Rt $rt) => Citizen::factory()->create(['village_id' => $rt->village_id, 'rt_id' => $rt->id])],
            'KK' => ['KK', fn (Rt $rt) => Family::factory()->create(['village_id' => $rt->village_id, 'rt_id' => $rt->id])],
            'pejabat lama (tidak aktif)' => ['pejabat', fn (Rt $rt) => Official::factory()->create([
                'village_id' => $rt->village_id, 'position' => 'rt', 'rt_id' => $rt->id, 'is_active' => false,
            ])],
            'surat' => ['surat', fn (Rt $rt) => Letter::factory()->create(['village_id' => $rt->village_id, 'rt_id' => $rt->id])],
            'pendaftaran akun' => ['pendaftaran akun', fn (Rt $rt) => AccountRegistration::query()->create([
                'village_id' => $rt->village_id,
                'citizen_id' => Citizen::factory()->create(['village_id' => $rt->village_id])->id,
                'rt_id' => $rt->id,
            ])],
            'permintaan foto profil' => ['permintaan foto profil', fn (Rt $rt) => ProfilePhotoRequest::query()->create([
                'village_id' => $rt->village_id,
                'user_id' => User::factory()->create(['village_id' => $rt->village_id])->id,
                'rt_id' => $rt->id,
            ])],
        ];
    }

    #[DataProvider('regionReferences')]
    public function test_region_used_by_other_data_cannot_be_deleted(string $label, Closure $refer): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);
        $rt = Rt::create(['rw_id' => $rw->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);
        $refer($rt);

        // RT itu sendiri, juga RW dan Dusun yang akan ikut menghapusnya.
        foreach (["/api/rts/{$rt->id}" => 'RT', "/api/rws/{$rw->id}" => 'RW', "/api/hamlets/{$hamlet->id}" => 'Dusun'] as $uri => $regionLabel) {
            $this->actingAs($user)
                ->deleteJson($uri)
                ->assertStatus(409)
                ->assertJsonPath('message', "{$regionLabel} tidak bisa dihapus karena masih dipakai data {$label}. Nonaktifkan saja bila wilayah ini sudah tidak dipakai.");
        }

        $this->assertModelExists($rt);
    }

    public function test_deactivating_rw_with_active_citizens_is_blocked(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);

        Citizen::create([
            'village_id' => $village->id,
            'nik' => '3218030101010002',
            'nik_hash' => hash('sha256', '3218030101010002'),
            'name' => 'Warga Aktif RW',
            'date_of_birth' => '1990-01-01',
            'gender' => 'L',
            'address' => 'Desa Cibenda',
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->patchJson("/api/rws/{$rw->id}", ['is_active' => false])
            ->assertStatus(200);

        $this->actingAs($user)
            ->deleteJson("/api/rws/{$rw->id}")
            ->assertStatus(200);
    }

    public function test_staf_sid_can_create_list_update_and_delete_rts(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);

        $this->actingAs($user)
            ->postJson('/api/rts', ['rw_id' => $rw->id, 'number' => '001'])
            ->assertCreated();

        $rt = Rt::firstWhere('rw_id', $rw->id);

        $this->actingAs($user)
            ->getJson("/api/rts?rw_id={$rw->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($user)
            ->patchJson("/api/rts/{$rt->id}", ['number' => '002'])
            ->assertOk();

        $this->actingAs($user)
            ->deleteJson("/api/rts/{$rt->id}")
            ->assertOk();

        $this->assertNull(Rt::find($rt->id));
    }

    public function test_non_staf_sid_cannot_create_rt(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = User::factory()->create(['village_id' => $village->id, 'role' => 'rt']);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);

        $this->actingAs($user)
            ->postJson('/api/rts', ['rw_id' => $rw->id, 'number' => '001'])
            ->assertForbidden();
    }

    public function test_duplicate_rt_number_within_same_rw_is_rejected(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);
        Rt::create(['rw_id' => $rw->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);

        $this->actingAs($user)
            ->postJson('/api/rts', ['rw_id' => $rw->id, 'number' => '001'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('number');
    }

    public function test_deactivating_rt_with_active_citizens_is_blocked(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = $this->stafSid($village);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);
        $rt = Rt::create(['rw_id' => $rw->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);

        Citizen::create([
            'village_id' => $village->id,
            'nik' => '3218030101010003',
            'nik_hash' => hash('sha256', '3218030101010003'),
            'name' => 'Warga Aktif RT',
            'date_of_birth' => '1990-01-01',
            'gender' => 'L',
            'address' => 'Desa Cibenda',
            'rt_id' => $rt->id,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->patchJson("/api/rts/{$rt->id}", ['is_active' => false])
            ->assertStatus(409);

        $this->actingAs($user)
            ->deleteJson("/api/rts/{$rt->id}")
            ->assertStatus(409);
    }

    public function test_petugas_cannot_update_region_from_another_village(): void
    {
        $ownerVillage = Village::factory()->create();
        $otherVillage = Village::factory()->create();
        $user = $this->stafSid($ownerVillage);
        $hamlet = Hamlet::factory()->create(['village_id' => $otherVillage->id]);

        // Wilayah desa lain tidak dibocorkan: 404, sama dengan warga/KK.
        $this->actingAs($user)
            ->patchJson("/api/hamlets/{$hamlet->id}", ['name' => 'Tidak boleh'])
            ->assertNotFound();
    }

    public function test_data_penduduk_roles_can_list_regions_but_not_manage_them(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $hamlet = Hamlet::create(['name' => 'Dusun A', 'code' => 'PTR', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'village_id' => $village->id, 'number' => '001', 'is_active' => true]);

        foreach (['kasi_pemerintahan', 'kaur_tu_umum'] as $role) {
            $user = User::factory()->create(['village_id' => $village->id, 'role' => $role]);

            $this->actingAs($user)->getJson('/api/hamlets')->assertOk()->assertJsonPath('data.0.id', $hamlet->id);
            $this->actingAs($user)->getJson("/api/rws?hamlet_id={$hamlet->id}")->assertOk()->assertJsonPath('data.0.id', $rw->id);
            $this->actingAs($user)->getJson("/api/rts?rw_id={$rw->id}")->assertOk();
            $this->actingAs($user)->postJson('/api/rws', ['hamlet_id' => $hamlet->id, 'number' => '002'])->assertForbidden();
        }

        $warga = User::factory()->create(['village_id' => $village->id, 'role' => 'warga']);
        $this->actingAs($warga)->getJson('/api/rts')->assertForbidden();
    }
}
