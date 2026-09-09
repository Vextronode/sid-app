<?php

namespace Tests\Feature;

use App\Models\News;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-8-S2 — Feature test untuk GET/POST /news dan PATCH/DELETE /news/{id}.
 *
 * Cakupan kondisi:
 *  - Seluruh endpoint butuh login (401 untuk guest).
 *  - Seluruh endpoint ditolak (403) untuk role selain petugas_desa.
 *  - GET /news bisa difilter status=draft|published.
 *  - POST /news sukses (201), slug digenerate otomatis dari judul.
 *  - POST /news dengan judul yang sama menghasilkan slug alternatif (suffix angka).
 *  - POST /news gagal validasi (422) jika title/content kosong.
 *  - POST /news dengan is_published=true otomatis mengisi published_at.
 *  - PATCH /news/{id} toggle draft->publish mengisi published_at, publish->draft mengosongkannya.
 *  - DELETE /news/{id} soft delete (tidak hilang permanen dari DB).
 */
class NewsEndpointTest extends TestCase
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
    public function guest_cannot_list_news(): void
    {
        $response = $this->getJson('/api/news');

        $response->assertStatus(401);
    }

    #[Test]
    public function non_petugas_desa_cannot_list_news(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $response = $this->actingAs($user)->getJson('/api/news');

        $response->assertStatus(403);
    }

    #[Test]
    public function petugas_desa_can_create_news_with_auto_generated_slug(): void
    {
        $user = $this->petugasDesa();

        $response = $this->actingAs($user)->postJson('/api/news', [
            'title' => 'Pengumuman Jadwal Posyandu',
            'content' => 'Posyandu akan dilaksanakan pada tanggal 10 Juli 2026.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.slug', 'pengumuman-jadwal-posyandu')
            ->assertJsonPath('data.is_published', false)
            ->assertJsonPath('data.published_at', null)
            ->assertJsonPath('data.author_name', $user->name);
    }

    #[Test]
    public function duplicate_title_generates_alternative_slug(): void
    {
        $user = $this->petugasDesa();

        $this->actingAs($user)->postJson('/api/news', [
            'title' => 'Pengumuman Jadwal Posyandu',
            'content' => 'Konten pertama.',
        ])->assertCreated();

        $response = $this->actingAs($user)->postJson('/api/news', [
            'title' => 'Pengumuman Jadwal Posyandu',
            'content' => 'Konten kedua.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.slug', 'pengumuman-jadwal-posyandu-2');
    }

    #[Test]
    public function creating_published_news_sets_published_at(): void
    {
        $user = $this->petugasDesa();

        $response = $this->actingAs($user)->postJson('/api/news', [
            'title' => 'Berita Langsung Terbit',
            'content' => 'Konten berita.',
            'is_published' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.is_published', true);

        $this->assertNotNull($response->json('data.published_at'));
    }

    #[Test]
    public function creating_news_without_required_fields_fails_validation(): void
    {
        $user = $this->petugasDesa();

        $response = $this->actingAs($user)->postJson('/api/news', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'content']);
    }

    #[Test]
    public function non_petugas_desa_cannot_create_news(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $response = $this->actingAs($user)->postJson('/api/news', [
            'title' => 'Judul',
            'content' => 'Konten',
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function petugas_desa_can_filter_news_by_status(): void
    {
        $user = $this->petugasDesa();

        News::create([
            'village_id' => $user->village_id,
            'author_id' => $user->id,
            'title' => 'Draft Saja',
            'slug' => 'draft-saja',
            'content' => 'Konten',
            'is_published' => false,
        ]);

        News::create([
            'village_id' => $user->village_id,
            'author_id' => $user->id,
            'title' => 'Sudah Publish',
            'slug' => 'sudah-publish',
            'content' => 'Konten',
            'is_published' => true,
            'published_at' => now(),
        ]);

        $this->actingAs($user)->getJson('/api/news?status=draft')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Draft Saja');

        $this->actingAs($user)->getJson('/api/news?status=published')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Sudah Publish');
    }

    #[Test]
    public function petugas_desa_can_toggle_publish_status(): void
    {
        $user = $this->petugasDesa();

        $news = News::create([
            'village_id' => $user->village_id,
            'author_id' => $user->id,
            'title' => 'Judul Berita',
            'slug' => 'judul-berita',
            'content' => 'Konten',
            'is_published' => false,
        ]);

        $publish = $this->actingAs($user)->patchJson("/api/news/{$news->id}", [
            'is_published' => true,
        ]);

        $publish->assertOk()->assertJsonPath('data.is_published', true);
        $this->assertNotNull($publish->json('data.published_at'));

        $unpublish = $this->actingAs($user)->patchJson("/api/news/{$news->id}", [
            'is_published' => false,
        ]);

        $unpublish->assertOk()
            ->assertJsonPath('data.is_published', false)
            ->assertJsonPath('data.published_at', null);
    }

    #[Test]
    public function is_published_as_string_true_false_is_accepted(): void
    {
        // Regresi: klien form-data/Postman mengirim "true"/"false" sebagai
        // teks, bukan boolean asli - rule `boolean` bawaan Laravel menolak
        // string ini kalau tidak dinormalisasi dulu di prepareForValidation().
        $user = $this->petugasDesa();

        $news = News::create([
            'village_id' => $user->village_id,
            'author_id' => $user->id,
            'title' => 'Judul Berita',
            'slug' => 'judul-berita-string-bool',
            'content' => 'Konten',
            'is_published' => false,
        ]);

        $publish = $this->actingAs($user)->patchJson("/api/news/{$news->id}", [
            'is_published' => 'true',
        ]);

        $publish->assertOk()->assertJsonPath('data.is_published', true);

        $unpublish = $this->actingAs($user)->patchJson("/api/news/{$news->id}", [
            'is_published' => 'false',
        ]);

        $unpublish->assertOk()->assertJsonPath('data.is_published', false);
    }

    #[Test]
    public function petugas_desa_can_soft_delete_news(): void
    {
        $user = $this->petugasDesa();

        $news = News::create([
            'village_id' => $user->village_id,
            'author_id' => $user->id,
            'title' => 'Judul Berita',
            'slug' => 'judul-berita',
            'content' => 'Konten',
            'is_published' => false,
        ]);

        $response = $this->actingAs($user)->deleteJson("/api/news/{$news->id}");

        $response->assertOk()->assertJsonPath('message', 'Berita berhasil dihapus');

        $this->assertSoftDeleted('news', ['id' => $news->id]);
    }
}
