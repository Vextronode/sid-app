<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Village;
use App\Models\VillageRegulation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-8-S3 — Feature test untuk GET/POST /regulations dan
 * PATCH/DELETE /regulations/{id}.
 *
 * Cakupan kondisi:
 *  - Seluruh endpoint butuh login (401 untuk guest).
 *  - Seluruh endpoint ditolak (403) untuk role selain petugas_desa.
 *  - POST /regulations sukses (201) dengan payload lengkap.
 *  - POST /regulations gagal validasi (422) jika regulation_number/title/content kosong.
 *  - PATCH /regulations/{id} sukses (200), tetap mewajibkan
 *    regulation_number/title/content (skema sama dengan create, bukan partial update).
 *  - DELETE /regulations/{id} hapus permanen (bukan soft delete - beda dengan news).
 */
class RegulationEndpointTest extends TestCase
{
    use RefreshDatabase;

    private function petugasDesa(): User
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);

        return User::factory()->create([
            'village_id' => $village->id,
            'role' => 'petugas_desa',
        ]);
    }

    #[Test]
    public function guest_cannot_list_regulations(): void
    {
        $response = $this->getJson('/api/regulations');

        $response->assertStatus(401);
    }

    #[Test]
    public function non_petugas_desa_cannot_list_regulations(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $response = $this->actingAs($user)->getJson('/api/regulations');

        $response->assertStatus(403);
    }

    #[Test]
    public function petugas_desa_can_create_regulation(): void
    {
        $user = $this->petugasDesa();

        $response = $this->actingAs($user)->postJson('/api/regulations', [
            'regulation_number' => '01/PERDES/2026',
            'title' => 'Peraturan Desa tentang Pengelolaan Sampah',
            'content' => 'Bab I Ketentuan Umum...',
            'enacted_date' => '2026-01-15',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.regulation_number', '01/PERDES/2026')
            ->assertJsonPath('data.title', 'Peraturan Desa tentang Pengelolaan Sampah')
            ->assertJsonPath('data.enacted_date', '2026-01-15')
            ->assertJsonPath('data.created_by', $user->id);
    }

    #[Test]
    public function non_petugas_desa_cannot_create_regulation(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $response = $this->actingAs($user)->postJson('/api/regulations', [
            'regulation_number' => '01/PERDES/2026',
            'title' => 'Judul',
            'content' => 'Konten',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function creating_regulation_without_required_fields_fails_validation(): void
    {
        $user = $this->petugasDesa();

        $response = $this->actingAs($user)->postJson('/api/regulations', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['regulation_number', 'title', 'content']);
    }

    #[Test]
    public function petugas_desa_can_update_regulation(): void
    {
        $user = $this->petugasDesa();

        $regulation = VillageRegulation::create([
            'village_id' => $user->village_id,
            'created_by' => $user->id,
            'regulation_number' => '01/PERDES/2026',
            'title' => 'Judul Lama',
            'content' => 'Konten lama',
        ]);

        $response = $this->actingAs($user)->patchJson("/api/regulations/{$regulation->id}", [
            'regulation_number' => '01/PERDES/2026',
            'title' => 'Judul Baru',
            'content' => 'Konten baru',
            'enacted_date' => '2026-02-01',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.title', 'Judul Baru')
            ->assertJsonPath('data.content', 'Konten baru')
            ->assertJsonPath('data.enacted_date', '2026-02-01');
    }

    #[Test]
    public function updating_regulation_without_required_fields_fails_validation(): void
    {
        $user = $this->petugasDesa();

        $regulation = VillageRegulation::create([
            'village_id' => $user->village_id,
            'created_by' => $user->id,
            'regulation_number' => '01/PERDES/2026',
            'title' => 'Judul',
            'content' => 'Konten',
        ]);

        $response = $this->actingAs($user)->patchJson("/api/regulations/{$regulation->id}", [
            'title' => 'Judul Baru Saja',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['regulation_number', 'content']);
    }

    #[Test]
    public function petugas_desa_can_delete_regulation_permanently(): void
    {
        $user = $this->petugasDesa();

        $regulation = VillageRegulation::create([
            'village_id' => $user->village_id,
            'created_by' => $user->id,
            'regulation_number' => '01/PERDES/2026',
            'title' => 'Judul',
            'content' => 'Konten',
        ]);

        $response = $this->actingAs($user)->deleteJson("/api/regulations/{$regulation->id}");

        $response->assertOk()->assertJsonPath('message', 'Peraturan desa berhasil dihapus');

        $this->assertDatabaseMissing('village_regulations', ['id' => $regulation->id]);
    }
}
