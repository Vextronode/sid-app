<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\News;
use App\Models\Official;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PublicPageCacheTest extends TestCase
{
    use RefreshDatabase;

    public function test_repeated_home_requests_are_served_from_cache(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $this->publishNews($village, 'Berita Pertama');

        $first = $this->getJson('/api/public/home')->assertOk()->json();

        // Perubahan langsung di database tidak memicu event model, jadi
        // respons kedua harus tetap berasal dari cache.
        DB::table('news')->update(['title' => 'Diubah Diam-diam']);

        $this->getJson('/api/public/home')
            ->assertOk()
            ->assertExactJson($first)
            ->assertJsonPath('data.latest_news.0.title', 'Berita Pertama');
    }

    public function test_changing_news_invalidates_cached_public_pages(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $news = $this->publishNews($village, 'Judul Lama');

        $this->getJson('/api/public/home')->assertJsonPath('data.latest_news.0.title', 'Judul Lama');
        $this->getJson('/api/public/news')->assertJsonPath('data.0.title', 'Judul Lama');

        $news->update(['title' => 'Judul Baru']);

        $this->getJson('/api/public/home')->assertJsonPath('data.latest_news.0.title', 'Judul Baru');
        $this->getJson('/api/public/news')->assertJsonPath('data.0.title', 'Judul Baru');

        $news->delete();

        $this->getJson('/api/public/home')->assertJsonCount(0, 'data.latest_news');
    }

    public function test_renaming_the_village_head_citizen_invalidates_cached_home(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $citizen = Citizen::factory()->create(['village_id' => $village->id, 'name' => 'Nama Lama']);
        Official::factory()->create([
            'citizen_id' => $citizen->id,
            'village_id' => $village->id,
            'position' => 'kepala_desa',
        ]);

        $this->getJson('/api/public/home')->assertJsonPath('data.village_head.name', 'Nama Lama');

        $citizen->update(['name' => 'Nama Baru']);

        $this->getJson('/api/public/home')->assertJsonPath('data.village_head.name', 'Nama Baru');
    }

    public function test_updating_village_profile_invalidates_cache(): void
    {
        $village = Village::create(['name' => 'Desa Lama', 'code' => 'CBD']);

        $this->getJson('/api/public/village-profile')->assertJsonPath('data.name', 'Desa Lama');

        $village->update(['name' => 'Desa Baru']);

        $this->getJson('/api/public/village-profile')->assertJsonPath('data.name', 'Desa Baru');
    }

    public function test_news_pages_are_cached_separately(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);

        foreach (range(1, 11) as $number) {
            $this->publishNews($village, "Berita {$number}");
        }

        $this->getJson('/api/public/news?page=1')->assertOk()->assertJsonCount(10, 'data');
        $this->getJson('/api/public/news?page=2')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_empty_results_are_not_cached(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);

        $this->getJson('/api/public/regulations')->assertNotFound();

        // Ditambahkan tanpa event model: bila 404 tadi ikut ter-cache,
        // permintaan berikutnya akan tetap 404.
        DB::table('village_regulations')->insert([
            'village_id' => $village->id,
            'title' => 'Perdes Baru',
            'regulation_number' => '1/2026',
            'content' => 'Isi peraturan',
            'enacted_date' => now()->toDateString(),
            'created_by' => User::factory()->create(['village_id' => $village->id])->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->getJson('/api/public/regulations')->assertOk()->assertJsonCount(1, 'data');
    }

    private function publishNews(Village $village, string $title): News
    {
        return News::create([
            'village_id' => $village->id,
            'author_id' => User::factory()->create(['village_id' => $village->id])->id,
            'title' => $title,
            'slug' => str($title)->slug().'-'.str()->random(6),
            'content' => 'Konten',
            'is_published' => true,
            'published_at' => now(),
        ]);
    }
}
