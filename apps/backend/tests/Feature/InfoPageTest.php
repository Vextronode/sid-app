<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Menu Halaman Informasi: isian khas desa untuk PPID, Kebijakan Privasi,
 * dan Aksesibilitas.
 */
class InfoPageTest extends TestCase
{
    use RefreshDatabase;

    private Village $village;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);
    }

    private function user(string $role = 'staf_sid'): User
    {
        return User::factory()->create(['village_id' => $this->village->id, 'role' => $role]);
    }

    #[Test]
    public function staf_sid_sees_all_pages_with_their_schema_and_empty_values(): void
    {
        $response = $this->actingAs($this->user())->getJson('/api/info-pages')->assertOk();

        $this->assertSame(['ppid', 'kebijakan-privasi', 'aksesibilitas'], array_column($response->json('data'), 'page'));
        $response
            ->assertJsonPath('data.0.fields.periodic_info', [])
            ->assertJsonPath('data.0.fields.ppid_officer', null)
            ->assertJsonPath('data.0.schema.0.key', 'ppid_officer')
            ->assertJsonPath('data.0.schema.0.type', 'text');
    }

    #[Test]
    public function staf_sid_saves_single_and_list_fields(): void
    {
        $this->actingAs($this->user())->putJson('/api/info-pages/ppid', [
            'ppid_officer' => '  Nama Sekdes, Sekretaris Desa ',
            'periodic_info' => ['Profil desa', '', '  APBDes dan realisasinya  ', 'Peraturan desa'],
            'ppid_email' => '',
            'unknown_field' => 'dibuang',
        ])->assertOk()
            ->assertJsonPath('data.fields.ppid_officer', 'Nama Sekdes, Sekretaris Desa')
            ->assertJsonPath('data.fields.periodic_info', ['Profil desa', 'APBDes dan realisasinya', 'Peraturan desa'])
            ->assertJsonPath('data.fields.ppid_email', null)
            ->assertJsonMissingPath('data.fields.unknown_field');

        $this->getJson('/api/public/info-pages/ppid')
            ->assertOk()
            ->assertJsonPath('data.fields.ppid_officer', 'Nama Sekdes, Sekretaris Desa')
            ->assertJsonPath('data.fields.periodic_info.1', 'APBDes dan realisasinya');
    }

    #[Test]
    public function public_page_refreshes_after_saving(): void
    {
        $staf = $this->user();
        $this->actingAs($staf)->putJson('/api/info-pages/aksesibilitas', ['response_time' => '3 hari kerja']);
        $this->getJson('/api/public/info-pages/aksesibilitas')->assertJsonPath('data.fields.response_time', '3 hari kerja');

        $this->actingAs($staf)->putJson('/api/info-pages/aksesibilitas', ['response_time' => '5 hari kerja']);

        $this->getJson('/api/public/info-pages/aksesibilitas')->assertJsonPath('data.fields.response_time', '5 hari kerja');
    }

    #[Test]
    public function fields_are_validated_by_type(): void
    {
        $this->actingAs($this->user())->putJson('/api/info-pages/kebijakan-privasi', [
            'effective_date' => '20-10-2026',
            'contact_email' => 'bukan email',
            'registration_data' => 'bukan daftar',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['effective_date', 'contact_email', 'registration_data']);

        $this->actingAs($this->user())->putJson('/api/info-pages/aksesibilitas', [
            'known_limitations' => array_fill(0, 31, 'Butir'),
        ])->assertStatus(422)->assertJsonValidationErrors(['known_limitations']);

        $this->actingAs($this->user())->putJson('/api/info-pages/aksesibilitas', [
            'known_limitations' => [str_repeat('a', 301)],
        ])->assertStatus(422)->assertJsonValidationErrors(['known_limitations.0']);
    }

    #[Test]
    public function unknown_pages_are_not_found(): void
    {
        $this->actingAs($this->user())->putJson('/api/info-pages/syarat-layanan', [])->assertNotFound();
        $this->getJson('/api/public/info-pages/syarat-layanan')->assertNotFound();
    }

    #[Test]
    public function public_page_has_empty_values_before_anything_is_saved(): void
    {
        $this->getJson('/api/public/info-pages/kebijakan-privasi')
            ->assertOk()
            ->assertJsonPath('data.fields.effective_date', null)
            ->assertJsonPath('data.fields.registration_data', [])
            ->assertJsonPath('data.updated_at', null);
    }

    #[Test]
    public function other_roles_cannot_manage_info_pages(): void
    {
        $kades = $this->user('kepala_desa');

        $this->actingAs($kades)->getJson('/api/info-pages')->assertForbidden();
        $this->actingAs($kades)->putJson('/api/info-pages/ppid', [])->assertForbidden();
    }
}
