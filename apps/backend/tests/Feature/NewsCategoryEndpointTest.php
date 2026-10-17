<?php

namespace Tests\Feature;

use App\Models\News;
use App\Models\NewsCategory;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NewsCategoryEndpointTest extends TestCase
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

    private function newsWith(NewsCategory $category): News
    {
        $news = News::create([
            'village_id' => $this->village->id,
            'author_id' => $this->petugas->id,
            'title' => 'Berita',
            'slug' => 'berita-'.$category->id,
            'content' => 'Konten',
        ]);
        $news->categories()->attach($category->id);

        return $news;
    }

    public function test_petugas_can_create_list_and_rename_a_category(): void
    {
        $id = $this->actingAs($this->petugas)
            ->postJson('/api/news-categories', ['name' => 'Kegiatan Warga'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Kegiatan Warga')
            ->assertJsonPath('data.slug', 'kegiatan-warga')
            ->assertJsonPath('data.news_count', 0)
            ->assertJsonPath('data.can_delete', true)
            ->json('data.id');

        $this->actingAs($this->petugas)
            ->getJson('/api/news-categories')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $id);

        $this->actingAs($this->petugas)
            ->patchJson("/api/news-categories/{$id}", ['name' => 'Kabar Warga'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Kabar Warga')
            ->assertJsonPath('data.slug', 'kabar-warga');

        // Ganti kapitalisasi nama sendiri tetap boleh.
        $this->actingAs($this->petugas)
            ->patchJson("/api/news-categories/{$id}", ['name' => 'kabar warga'])
            ->assertOk();
    }

    public function test_name_must_be_unique_within_the_village(): void
    {
        NewsCategory::factory()->create(['village_id' => $this->village->id, 'name' => 'Umum', 'slug' => 'umum']);
        $other = NewsCategory::factory()->create(['village_id' => $this->village->id, 'name' => 'Budaya', 'slug' => 'budaya']);

        foreach (['Umum', 'UMUM', '!!!', ''] as $name) {
            $this->actingAs($this->petugas)
                ->postJson('/api/news-categories', ['name' => $name])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['name']);
        }

        $this->actingAs($this->petugas)
            ->patchJson("/api/news-categories/{$other->id}", ['name' => 'Umum'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);

        // Desa lain boleh memakai nama yang sama.
        $otherPetugas = User::factory()->create(['role' => 'staf_sid', 'village_id' => Village::factory()]);
        $this->actingAs($otherPetugas)
            ->postJson('/api/news-categories', ['name' => 'Umum'])
            ->assertCreated();
    }

    public function test_unused_category_can_be_deleted(): void
    {
        $category = NewsCategory::factory()->create(['village_id' => $this->village->id]);

        $this->actingAs($this->petugas)
            ->deleteJson("/api/news-categories/{$category->id}")
            ->assertOk();

        $this->assertModelMissing($category);
    }

    public function test_used_category_cannot_be_deleted_even_if_the_news_was_deleted(): void
    {
        $used = NewsCategory::factory()->create(['village_id' => $this->village->id]);
        $news = $this->newsWith($used);

        $this->actingAs($this->petugas)
            ->getJson('/api/news-categories')
            ->assertJsonPath('data.0.news_count', 1)
            ->assertJsonPath('data.0.can_delete', false);

        $this->actingAs($this->petugas)
            ->deleteJson("/api/news-categories/{$used->id}")
            ->assertStatus(409);

        $news->delete();

        $this->actingAs($this->petugas)
            ->getJson('/api/news-categories')
            ->assertJsonPath('data.0.can_delete', false);

        $this->actingAs($this->petugas)
            ->deleteJson("/api/news-categories/{$used->id}")
            ->assertStatus(409);

        $this->assertModelExists($used);
    }

    public function test_categories_of_another_village_are_not_reachable(): void
    {
        $foreign = NewsCategory::factory()->create(['village_id' => Village::factory()]);

        $this->actingAs($this->petugas)->getJson('/api/news-categories')->assertJsonCount(0, 'data');
        $this->actingAs($this->petugas)->patchJson("/api/news-categories/{$foreign->id}", ['name' => 'X'])->assertNotFound();
        $this->actingAs($this->petugas)->deleteJson("/api/news-categories/{$foreign->id}")->assertNotFound();
    }

    public function test_only_staf_sid_can_manage_categories(): void
    {
        $this->getJson('/api/news-categories')->assertUnauthorized();

        $warga = User::factory()->create(['role' => 'warga', 'village_id' => $this->village->id]);
        $this->actingAs($warga)->getJson('/api/news-categories')->assertForbidden();
        $this->actingAs($warga)->postJson('/api/news-categories', ['name' => 'Umum'])->assertForbidden();
    }

    public function test_public_news_lists_include_categories(): void
    {
        $category = NewsCategory::factory()->create(['village_id' => $this->village->id, 'name' => 'Pengumuman', 'slug' => 'pengumuman']);
        $news = $this->newsWith($category);
        $news->update(['is_published' => true, 'published_at' => now()]);

        $query = '?village_code='.$this->village->code;

        $this->getJson('/api/public/news'.$query)
            ->assertOk()
            ->assertJsonPath('data.0.categories.0.name', 'Pengumuman')
            ->assertJsonMissingPath('data.0.categories.0.news_count');

        $this->getJson('/api/public/home'.$query)
            ->assertOk()
            ->assertJsonPath('data.latest_news.0.categories.0.name', 'Pengumuman');
    }
}
