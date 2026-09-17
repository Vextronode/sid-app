<?php

namespace Tests\Feature;

use App\Models\LetterType;
use App\Models\News;
use App\Models\Official;
use App\Models\User;
use App\Models\Village;
use App\Models\VillageRegulation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-8-S5 — Feature test untuk seluruh endpoint UC-16 (/public/*).
 *
 * Cakupan kondisi:
 *  - Seluruh endpoint bisa diakses TANPA login (bukan cuma tidak 401 -
 *    dites eksplisit tanpa actingAs sama sekali).
 *  - /public/home: 404 kalau villages belum di-setup, 200 dengan
 *    village+latest_news+public_stats kalau ada.
 *  - /public/village-profile: sama data dengan Village yang ada.
 *  - /public/news: hanya is_published=true, dipaginasi, tidak 404
 *    meski kosong.
 *  - /public/letter-types: hanya is_active=true + punya template,
 *    field dibatasi (code/name/requirements_info saja), 404 kalau kosong.
 *  - /public/regulations: semua regulation (tidak ada filter publish),
 *    404 kalau kosong.
 *  - /public/contact-us: hanya kasi_pelayanan/kaur_tu_umum aktif,
 *    wa_link diturunkan dari phone_wa, 404 kalau kosong.
 */
class PublicPageEndpointTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function home_returns_404_when_village_not_set_up(): void
    {
        $response = $this->getJson('/api/public/home');

        $response->assertStatus(404);
    }

    #[Test]
    public function home_returns_village_latest_news_and_stats_without_login(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $author = User::factory()->create(['village_id' => $village->id]);

        News::create([
            'village_id' => $village->id,
            'author_id' => $author->id,
            'title' => 'Berita Terbit',
            'slug' => 'berita-terbit',
            'content' => 'Konten',
            'is_published' => true,
            'published_at' => now(),
        ]);
        News::create([
            'village_id' => $village->id,
            'author_id' => $author->id,
            'title' => 'Masih Draft',
            'slug' => 'masih-draft',
            'content' => 'Konten',
            'is_published' => false,
        ]);

        LetterType::factory()->create(['is_active' => true, 'template' => '<html></html>']);

        $response = $this->getJson('/api/public/home');

        $response->assertOk()
            ->assertJsonPath('data.village.name', 'Desa Cibenda')
            ->assertJsonCount(1, 'data.latest_news')
            ->assertJsonPath('data.latest_news.0.title', 'Berita Terbit')
            ->assertJsonPath('data.public_stats.total_letter_types', 1);
    }

    #[Test]
    public function village_profile_is_accessible_without_login(): void
    {
        Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD', 'vision' => 'Maju Bersama']);

        $response = $this->getJson('/api/public/village-profile');

        $response->assertOk()->assertJsonPath('data.vision', 'Maju Bersama');
    }

    #[Test]
    public function news_list_only_shows_published_and_is_paginated(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $author = User::factory()->create(['village_id' => $village->id]);

        News::create([
            'village_id' => $village->id,
            'author_id' => $author->id,
            'title' => 'Published',
            'slug' => 'published',
            'content' => 'Konten',
            'is_published' => true,
            'published_at' => now(),
        ]);
        News::create([
            'village_id' => $village->id,
            'author_id' => $author->id,
            'title' => 'Draft',
            'slug' => 'draft',
            'content' => 'Konten',
            'is_published' => false,
        ]);

        $response = $this->getJson('/api/public/news');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Published')
            ->assertJsonPath('meta.current_page', 1);
    }

    #[Test]
    public function news_list_does_not_404_when_empty(): void
    {
        Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);

        $response = $this->getJson('/api/public/news');

        $response->assertOk()->assertJsonCount(0, 'data');
    }

    #[Test]
    public function news_list_rejects_invalid_page_param(): void
    {
        $response = $this->getJson('/api/public/news?page=abc');

        $response->assertStatus(422);
    }

    #[Test]
    public function letter_types_only_shows_active_with_template_and_hides_internal_fields(): void
    {
        LetterType::factory()->create([
            'code' => 'SKD',
            'name' => 'Surat Keterangan Domisili',
            'requirement_info' => 'Fotokopi KTP dan KK',
            'is_active' => true,
            'template' => '<html></html>',
        ]);
        LetterType::factory()->create(['is_active' => false, 'template' => '<html></html>']);

        $response = $this->getJson('/api/public/letter-types');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'SKD')
            ->assertJsonMissingPath('data.0.id')
            ->assertJsonMissingPath('data.0.category_id');
    }

    #[Test]
    public function letter_types_returns_404_when_none_active(): void
    {
        $response = $this->getJson('/api/public/letter-types');

        $response->assertStatus(404);
    }

    #[Test]
    public function regulations_list_shows_all_without_publish_filter(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
        $user = User::factory()->create(['village_id' => $village->id]);

        VillageRegulation::create([
            'village_id' => $village->id,
            'created_by' => $user->id,
            'regulation_number' => '01/PERDES/2026',
            'title' => 'Peraturan Sampah',
            'content' => 'Isi peraturan',
        ]);

        $response = $this->getJson('/api/public/regulations');

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    #[Test]
    public function regulations_returns_404_when_none_exist(): void
    {
        Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);

        $response = $this->getJson('/api/public/regulations');

        $response->assertStatus(404);
    }

    #[Test]
    public function contact_us_only_shows_active_kasi_and_kaur_with_wa_link(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);

        Official::factory()->create([
            'village_id' => $village->id,
            'position' => 'kasi_pelayanan',
            'phone_wa' => '6281234567890',
            'is_active' => true,
        ]);
        Official::factory()->create([
            'village_id' => $village->id,
            'position' => 'rt',
            'phone_wa' => '6280000000000',
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/public/contact-us');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.position', 'kasi_pelayanan')
            ->assertJsonPath('data.0.wa_link', 'https://wa.me/6281234567890');
    }

    #[Test]
    public function contact_us_returns_404_when_none_active(): void
    {
        $response = $this->getJson('/api/public/contact-us');

        $response->assertStatus(404);
    }
}
