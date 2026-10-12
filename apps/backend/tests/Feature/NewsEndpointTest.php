<?php

namespace Tests\Feature;

use App\Models\News;
use App\Models\NewsCategory;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
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
 *  - Berita wajib punya 1-2 kategori milik desa sendiri; kategori bisa
 *    diganti lewat PATCH, dan PATCH publish saja tidak menyentuh kategori.
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

    private function category(User $user, ?string $name = null): NewsCategory
    {
        return NewsCategory::factory()->create(array_filter([
            'village_id' => $user->village_id,
            'name' => $name,
            'slug' => $name ? Str::slug($name) : null,
        ]));
    }

    private function draftNews(User $user, string $slug = 'judul-berita'): News
    {
        return News::create([
            'village_id' => $user->village_id,
            'author_id' => $user->id,
            'title' => 'Judul Berita',
            'slug' => $slug,
            'content' => 'Konten',
            'is_published' => false,
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
            'category_ids' => [$this->category($user)->id],
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
            'category_ids' => [$this->category($user)->id],
        ])->assertCreated();

        $response = $this->actingAs($user)->postJson('/api/news', [
            'title' => 'Pengumuman Jadwal Posyandu',
            'content' => 'Konten kedua.',
            'category_ids' => [$this->category($user)->id],
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
            'category_ids' => [$this->category($user)->id],
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
            ->assertJsonValidationErrors(['title', 'content', 'category_ids']);
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

    #[Test]
    public function news_can_be_created_with_one_or_two_categories(): void
    {
        $user = $this->petugasDesa();
        $umum = $this->category($user, 'Umum');
        $budaya = $this->category($user, 'Budaya');

        $this->actingAs($user)->postJson('/api/news', [
            'title' => 'Satu Kategori',
            'content' => 'Konten',
            'category_ids' => [$umum->id],
        ])->assertCreated()
            ->assertJsonCount(1, 'data.categories')
            ->assertJsonPath('data.categories.0.name', 'Umum');

        $response = $this->actingAs($user)->postJson('/api/news', [
            'title' => 'Dua Kategori',
            'content' => 'Konten',
            'category_ids' => [$umum->id, $budaya->id],
        ])->assertCreated()
            ->assertJsonCount(2, 'data.categories');

        $this->assertEqualsCanonicalizing(
            [$umum->id, $budaya->id],
            News::findOrFail($response->json('data.id'))->categories()->pluck('news_categories.id')->all(),
        );

        $listed = collect($this->actingAs($user)->getJson('/api/news')->assertOk()->json('data'))
            ->mapWithKeys(fn (array $item) => [$item['title'] => count($item['categories'])]);
        $this->assertSame(['Dua Kategori' => 2, 'Satu Kategori' => 1], $listed->sortKeys()->all());
    }

    #[Test]
    public function news_category_count_and_ownership_are_validated(): void
    {
        $user = $this->petugasDesa();
        [$a, $b, $c] = [$this->category($user, 'A'), $this->category($user, 'B'), $this->category($user, 'C')];
        $otherVillage = NewsCategory::factory()->create([
            'village_id' => Village::create(['name' => 'Desa Lain', 'code' => 'LAIN'])->id,
        ]);

        $invalid = [
            [],
            [$a->id, $b->id, $c->id],
            [$a->id, $a->id],
            [$otherVillage->id],
            [999999],
        ];

        foreach ($invalid as $ids) {
            $this->actingAs($user)->postJson('/api/news', [
                'title' => 'Judul',
                'content' => 'Konten',
                'category_ids' => $ids,
            ])->assertStatus(422);
        }

        $this->assertSame(0, News::count());
    }

    #[Test]
    public function news_categories_can_be_changed_on_update(): void
    {
        $user = $this->petugasDesa();
        $umum = $this->category($user, 'Umum');
        $budaya = $this->category($user, 'Budaya');
        $news = $this->draftNews($user);
        $news->categories()->attach($umum->id);

        $this->actingAs($user)->patchJson("/api/news/{$news->id}", [
            'category_ids' => [$budaya->id],
        ])->assertOk()
            ->assertJsonCount(1, 'data.categories')
            ->assertJsonPath('data.categories.0.name', 'Budaya');

        // Publish saja tidak mengubah kategori.
        $this->actingAs($user)->patchJson("/api/news/{$news->id}", ['is_published' => true])
            ->assertOk()
            ->assertJsonPath('data.categories.0.name', 'Budaya');

        // Kategori tidak boleh dikosongkan atau lebih dari dua.
        $this->actingAs($user)->patchJson("/api/news/{$news->id}", ['category_ids' => []])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['category_ids']);
    }
}
