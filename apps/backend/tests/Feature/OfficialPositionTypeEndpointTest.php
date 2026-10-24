<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Official;
use App\Models\OfficialPositionType;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OfficialPositionTypeEndpointTest extends TestCase
{
    use RefreshDatabase;

    private Village $village;

    private User $petugas;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        $this->petugas = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);
    }

    public function test_petugas_can_create_list_and_update_a_position_type(): void
    {
        OfficialPositionType::factory()->create(['village_id' => $this->village->id, 'sort_order' => 4]);

        $id = $this->actingAs($this->petugas)
            ->postJson('/api/official-position-types', ['label' => 'Kasi Ketentraman & Ketertiban'])
            ->assertCreated()
            ->assertJsonPath('data.code', 'kasi_ketentraman_ketertiban')
            ->assertJsonPath('data.label', 'Kasi Ketentraman & Ketertiban')
            ->assertJsonPath('data.is_single_occupant', true)
            ->assertJsonPath('data.is_active', true)
            // Tanpa urutan, jabatan baru ditaruh paling akhir.
            ->assertJsonPath('data.sort_order', 5)
            ->json('data.id');

        $this->actingAs($this->petugas)
            ->getJson('/api/official-position-types')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.1.id', $id);

        // Nama boleh berubah, kodenya tidak ikut berubah.
        $this->actingAs($this->petugas)
            ->patchJson("/api/official-position-types/{$id}", ['label' => 'Kasi Trantib', 'sort_order' => 1])
            ->assertOk()
            ->assertJsonPath('data.code', 'kasi_ketentraman_ketertiban')
            ->assertJsonPath('data.label', 'Kasi Trantib')
            ->assertJsonPath('data.sort_order', 1);
    }

    public function test_label_must_not_collide_with_an_existing_or_account_position(): void
    {
        OfficialPositionType::factory()->code('kaur_keuangan')->create(['village_id' => $this->village->id]);
        // Kodenya tetap kasi_trantib setelah berganti nama; nama barunya juga terpakai.
        OfficialPositionType::factory()->code('kasi_trantib', 'Kasi Ketentraman & Ketertiban')
            ->create(['village_id' => $this->village->id]);

        // Kode jabatan berakun bukan slug labelnya (mis. `rt` untuk "Ketua RT"),
        // jadi label jabatan berakun ikut dibandingkan, termasuk "Staf {nama aplikasi}".
        $taken = [
            'Kaur Keuangan', 'kaur-keuangan', 'Kasi Trantib', 'kasi ketentraman ketertiban',
            'Kepala Desa', 'Sekretaris Desa', 'Ketua RT', 'ketua rw', 'KEPALA DUSUN', 'Staf SIDUTama', '!!!',
        ];

        foreach ($taken as $label) {
            $this->actingAs($this->petugas)
                ->postJson('/api/official-position-types', ['label' => $label])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['label']);
        }

        $this->actingAs($this->petugas)
            ->postJson('/api/official-position-types', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['label']);

        // Desa lain boleh memakai nama yang sama.
        $other = User::factory()->create(['role' => 'staf_sid', 'village_id' => Village::factory()]);
        $this->actingAs($other)
            ->postJson('/api/official-position-types', ['label' => 'Kaur Keuangan'])
            ->assertCreated();
    }

    public function test_staf_sid_label_collision_follows_the_configured_app_name(): void
    {
        config(['sid.app_name' => 'SIPANDESA']);

        $this->actingAs($this->petugas)
            ->postJson('/api/official-position-types', ['label' => 'Staf SIPANDESA'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['label']);

        $this->actingAs($this->petugas)
            ->postJson('/api/official-position-types', ['label' => 'Staf SIDUTama'])
            ->assertCreated();
    }

    public function test_renaming_a_position_type_must_not_collide_with_another_position(): void
    {
        OfficialPositionType::factory()->code('kaur_keuangan')->create(['village_id' => $this->village->id]);
        $type = OfficialPositionType::factory()->code('kasi_trantib', 'Kasi Trantib')
            ->create(['village_id' => $this->village->id]);

        foreach (['Kepala Dusun', 'Staf SIDUTama', 'Kaur Keuangan'] as $label) {
            $this->actingAs($this->petugas)
                ->patchJson("/api/official-position-types/{$type->id}", ['label' => $label])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['label']);
        }

        // Nama sendiri dengan penulisan lain tetap boleh.
        $this->actingAs($this->petugas)
            ->patchJson("/api/official-position-types/{$type->id}", ['label' => 'KASI TRANTIB'])
            ->assertOk()
            ->assertJsonPath('data.label', 'KASI TRANTIB');

        // Perubahan tanpa label tidak memeriksa nama.
        $this->actingAs($this->petugas)
            ->patchJson("/api/official-position-types/{$type->id}", ['sort_order' => 3])
            ->assertOk();
    }

    public function test_list_includes_account_positions_with_labels_and_scope(): void
    {
        $staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);

        $this->actingAs($staf)
            ->getJson('/api/official-position-types')
            ->assertOk()
            ->assertJsonPath('account_positions', [
                ['code' => 'kepala_desa', 'label' => 'Kepala Desa', 'scope' => null],
                ['code' => 'sekretaris_desa', 'label' => 'Sekretaris Desa', 'scope' => null],
                ['code' => 'kasi_pemerintahan', 'label' => 'Kasi Pemerintahan', 'scope' => null],
                ['code' => 'kaur_tu_umum', 'label' => 'Kaur TU & Umum', 'scope' => null],
                ['code' => 'kadus', 'label' => 'Kepala Dusun', 'scope' => 'hamlet_id'],
                ['code' => 'rw', 'label' => 'Ketua RW', 'scope' => 'rw_id'],
                ['code' => 'rt', 'label' => 'Ketua RT', 'scope' => 'rt_id'],
                ['code' => 'staf_sid', 'label' => 'Staf SIDUTama', 'scope' => null],
            ]);

        // Label staf aplikasi mengikuti nama aplikasi yang diatur (SID_APP_NAME).
        config(['sid.app_name' => 'SIPANDESA']);

        $this->actingAs($staf)
            ->getJson('/api/official-position-types')
            ->assertJsonPath('account_positions.7.label', 'Staf SIPANDESA');
    }

    public function test_position_types_are_limited_to_staf_sid_of_the_same_village(): void
    {
        $type = OfficialPositionType::factory()->create(['village_id' => $this->village->id]);
        $foreign = User::factory()->create(['role' => 'staf_sid', 'village_id' => Village::factory()]);

        $this->getJson('/api/official-position-types')->assertUnauthorized();
        $this->actingAs(User::factory()->create(['role' => 'kepala_desa', 'village_id' => $this->village->id]))
            ->getJson('/api/official-position-types')
            ->assertForbidden();

        $this->actingAs($foreign)->getJson('/api/official-position-types')->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($foreign)
            ->patchJson("/api/official-position-types/{$type->id}", ['label' => 'Diubah'])
            ->assertNotFound();
        $this->actingAs($foreign)->deleteJson("/api/official-position-types/{$type->id}")->assertNotFound();
    }

    public function test_a_position_type_in_use_cannot_be_deactivated_or_deleted(): void
    {
        $type = OfficialPositionType::factory()->code('kaur_keuangan')->create(['village_id' => $this->village->id]);
        $official = Official::factory()->position('kaur_keuangan')->create(['village_id' => $this->village->id]);

        $this->actingAs($this->petugas)
            ->patchJson("/api/official-position-types/{$type->id}", ['is_active' => false])
            ->assertStatus(409);
        $this->actingAs($this->petugas)
            ->deleteJson("/api/official-position-types/{$type->id}")
            ->assertStatus(409);

        // Setelah jabatannya berakhir boleh dinonaktifkan, tetapi riwayatnya
        // tetap menahan penghapusan.
        $official->update(['is_active' => false, 'ended_at' => today()]);

        $this->actingAs($this->petugas)
            ->patchJson("/api/official-position-types/{$type->id}", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);
        $this->actingAs($this->petugas)
            ->deleteJson("/api/official-position-types/{$type->id}")
            ->assertStatus(409);

        $unused = OfficialPositionType::factory()->create(['village_id' => $this->village->id]);
        $this->actingAs($this->petugas)
            ->deleteJson("/api/official-position-types/{$unused->id}")
            ->assertOk();
        $this->assertDatabaseMissing('official_position_types', ['id' => $unused->id]);
    }

    public function test_citizens_can_be_appointed_to_a_position_created_by_petugas(): void
    {
        Storage::fake('public');
        $appoint = fn (string $position) => $this->actingAs($this->petugas)
            ->post('/api/officials/promote', [
                'citizen_id' => Citizen::factory()->create(['village_id' => $this->village->id])->id,
                'position' => $position,
                'started_at' => today()->toDateString(),
                'photo' => UploadedFile::fake()->image('foto.jpg'),
            ], ['Accept' => 'application/json']);

        $single = $this->actingAs($this->petugas)
            ->postJson('/api/official-position-types', ['label' => 'Kasi Trantib'])
            ->json('data');
        $shared = $this->actingAs($this->petugas)
            ->postJson('/api/official-position-types', ['label' => 'Staf Umum', 'is_single_occupant' => false])
            ->json('data');

        $appoint($single['code'])->assertCreated()->assertJsonPath('data.position_label', 'Kasi Trantib');
        // Jabatan satu pemegang menolak pejabat kedua; jabatan bersama tidak.
        $appoint($single['code'])->assertStatus(409);
        $appoint($shared['code'])->assertCreated();
        $appoint($shared['code'])->assertCreated();

        // Tidak bisa dijadikan satu pemegang selama dijabat dua orang.
        $this->actingAs($this->petugas)
            ->patchJson("/api/official-position-types/{$shared['id']}", ['is_single_occupant' => true])
            ->assertStatus(409);

        // Jabatan nonaktif, tidak dikenal, atau milik desa lain ditolak.
        $inactive = OfficialPositionType::factory()->create(['village_id' => $this->village->id, 'is_active' => false]);
        $foreign = OfficialPositionType::factory()->create(['village_id' => Village::factory()]);

        foreach ([$inactive->code, $foreign->code, 'jabatan_karangan'] as $position) {
            $appoint($position)->assertUnprocessable()->assertJsonValidationErrors(['position']);
        }
    }

    public function test_renaming_a_position_type_refreshes_the_label_and_the_public_profile(): void
    {
        $type = OfficialPositionType::factory()->code('kaur_keuangan', 'Kaur Keuangan')
            ->create(['village_id' => $this->village->id]);
        Official::factory()->position('kaur_keuangan')->create(['village_id' => $this->village->id]);

        $this->getJson('/api/public/village-profile')
            ->assertJsonPath('positions.2.label', 'Kaur Keuangan')
            ->assertJsonPath('officials.0.position_label', 'Kaur Keuangan');

        $this->actingAs($this->petugas)
            ->patchJson("/api/official-position-types/{$type->id}", ['label' => 'Kaur Keuangan & Aset'])
            ->assertOk();

        $this->getJson('/api/public/village-profile')
            ->assertJsonPath('positions.2.label', 'Kaur Keuangan & Aset')
            ->assertJsonPath('officials.0.position_label', 'Kaur Keuangan & Aset');
        $this->actingAs($this->petugas)
            ->getJson('/api/officials')
            ->assertJsonPath('data.0.position_label', 'Kaur Keuangan & Aset');
    }
}
