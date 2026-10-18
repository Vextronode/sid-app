<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Pengumuman beranda: satu per desa, dikelola Petugas Desa, durasi wajib,
 * dihapus otomatis setelah lewat waktunya.
 */
class AnnouncementTest extends TestCase
{
    use RefreshDatabase;

    private Village $village;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(now()->setDate(2026, 10, 20)->setTime(9, 0));
        $this->village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
    }

    private function user(string $role = 'staf_sid'): User
    {
        return User::factory()->create(['village_id' => $this->village->id, 'role' => $role]);
    }

    private function payload(array $overrides = []): array
    {
        return [
            'title' => 'Kantor desa tutup Jumat siang',
            'body' => 'Pelayanan surat dibuka lagi Senin pukul 08.00.',
            'link_url' => '/berita/12',
            'duration_value' => 12,
            'duration_unit' => 'hour',
            ...$overrides,
        ];
    }

    #[Test]
    public function staf_sid_publishes_an_announcement_with_a_duration(): void
    {
        $this->actingAs($this->user())->putJson('/api/announcement', $this->payload())
            ->assertOk()
            ->assertJsonPath('data.title', 'Kantor desa tutup Jumat siang')
            ->assertJsonPath('data.link_url', '/berita/12')
            ->assertJsonPath('data.expires_at', now()->addHours(12)->toIso8601String());

        $this->getJson('/api/public/home')
            ->assertOk()
            ->assertJsonPath('data.announcement.title', 'Kantor desa tutup Jumat siang')
            ->assertJsonPath('data.announcement.body', 'Pelayanan surat dibuka lagi Senin pukul 08.00.');
    }

    #[Test]
    public function duration_is_required_for_a_new_announcement(): void
    {
        $this->actingAs($this->user())
            ->putJson('/api/announcement', $this->payload(['duration_value' => null, 'duration_unit' => null]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['duration_value']);

        $this->actingAs($this->user())
            ->putJson('/api/announcement', $this->payload(['duration_unit' => 'month']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['duration_unit']);

        $this->actingAs($this->user())
            ->putJson('/api/announcement', $this->payload(['duration_value' => 60, 'duration_unit' => 'week']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['duration_value']);

        $this->assertDatabaseCount('announcements', 0);
    }

    #[Test]
    public function link_must_be_https_or_an_internal_path(): void
    {
        foreach (['http://contoh.id', 'javascript:alert(1)', '//evil.test', 'berita/12'] as $link) {
            $this->actingAs($this->user())
                ->putJson('/api/announcement', $this->payload(['link_url' => $link]))
                ->assertStatus(422)
                ->assertJsonValidationErrors(['link_url']);
        }

        $this->actingAs($this->user())
            ->putJson('/api/announcement', $this->payload(['link_url' => 'https://pangandarankab.go.id/info']))
            ->assertOk();
    }

    #[Test]
    public function only_one_announcement_exists_per_village(): void
    {
        $staf = $this->user();

        $this->actingAs($staf)->putJson('/api/announcement', $this->payload())->assertOk();
        $this->actingAs($staf)->putJson('/api/announcement', $this->payload([
            'title' => 'Posyandu Sabtu pagi',
            'duration_value' => 1,
            'duration_unit' => 'day',
        ]))->assertOk();

        $this->assertDatabaseCount('announcements', 1);
        $this->actingAs($staf)->getJson('/api/announcement')
            ->assertJsonPath('data.title', 'Posyandu Sabtu pagi')
            ->assertJsonPath('data.expires_at', now()->addDay()->toIso8601String());
    }

    #[Test]
    public function editing_without_a_duration_keeps_the_end_time(): void
    {
        $staf = $this->user();
        $this->actingAs($staf)->putJson('/api/announcement', $this->payload(['duration_value' => 1, 'duration_unit' => 'week']));

        $this->travel(2)->hours();

        $this->actingAs($staf)->putJson('/api/announcement', [
            'title' => 'Judul diperbaiki',
            'body' => null,
        ])->assertOk()
            ->assertJsonPath('data.title', 'Judul diperbaiki')
            ->assertJsonPath('data.body', null)
            ->assertJsonPath('data.expires_at', now()->subHours(2)->addWeek()->toIso8601String());
    }

    #[Test]
    public function expired_announcements_are_hidden_and_pruned(): void
    {
        $this->actingAs($this->user())->putJson('/api/announcement', $this->payload(['duration_value' => 1, 'duration_unit' => 'hour']));

        // Cache beranda terisi saat pengumuman masih tayang.
        $this->getJson('/api/public/home')->assertJsonPath('data.announcement.title', 'Kantor desa tutup Jumat siang');

        $this->travel(61)->minutes();

        $this->artisan('announcements:prune')->assertSuccessful();

        $this->assertDatabaseCount('announcements', 0);
        $this->getJson('/api/public/home')->assertJsonPath('data.announcement', null);
        $this->actingAs($this->user())->getJson('/api/announcement')->assertJsonPath('data', null);
    }

    #[Test]
    public function expired_announcement_is_not_shown_even_before_pruning(): void
    {
        Announcement::create([
            'village_id' => $this->village->id,
            'title' => 'Sudah lewat',
            'expires_at' => now()->subMinute(),
        ]);

        $this->getJson('/api/public/home')->assertJsonPath('data.announcement', null);
    }

    #[Test]
    public function staf_sid_deletes_the_announcement(): void
    {
        $staf = $this->user();
        $this->actingAs($staf)->putJson('/api/announcement', $this->payload());
        $this->getJson('/api/public/home')->assertJsonPath('data.announcement.title', 'Kantor desa tutup Jumat siang');

        $this->actingAs($staf)->deleteJson('/api/announcement')->assertOk();

        $this->assertDatabaseCount('announcements', 0);
        $this->getJson('/api/public/home')->assertJsonPath('data.announcement', null);
    }

    #[Test]
    public function other_roles_cannot_manage_announcements(): void
    {
        $kades = $this->user('kepala_desa');

        $this->actingAs($kades)->getJson('/api/announcement')->assertForbidden();
        $this->actingAs($kades)->putJson('/api/announcement', $this->payload())->assertForbidden();
        $this->actingAs($kades)->deleteJson('/api/announcement')->assertForbidden();
    }
}
