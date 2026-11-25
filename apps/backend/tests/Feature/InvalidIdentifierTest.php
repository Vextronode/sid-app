<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Id dengan format salah harus berakhir 404/422, bukan 500.
 *
 * Di SQLite (test lokal) query dengan id salah format hanya "tidak
 * ketemu", jadi test ini baru benar-benar menjaga perilaku saat CI
 * berjalan di PostgreSQL, yang melempar error untuk `where id = 'abc'`
 * pada kolom uuid/bigint.
 */
class InvalidIdentifierTest extends TestCase
{
    use RefreshDatabase;

    private function stafSid(): User
    {
        $village = Village::factory()->create();

        return User::factory()->create(['village_id' => $village->id, 'role' => 'staf_sid']);
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function malformedRouteIds(): array
    {
        return [
            'detail surat ({id} uuid)' => ['get', '/api/letters/bukan-uuid'],
            'sosial ekonomi KK ({id} uuid)' => ['get', '/api/families/bukan-uuid/socioeconomic'],
            'tandai notifikasi ({id} uuid)' => ['post', '/api/notifications/bukan-uuid/read'],
            'ubah berita ({id} angka)' => ['patch', '/api/news/abc'],
            'ubah dusun (binding angka)' => ['patch', '/api/hamlets/abc'],
            'detail pejabat (binding angka)' => ['get', '/api/officials/abc'],
        ];
    }

    #[DataProvider('malformedRouteIds')]
    public function test_malformed_route_id_returns_not_found(string $method, string $uri): void
    {
        $this->actingAs($this->stafSid())
            ->json($method, $uri)
            ->assertNotFound();
    }

    public function test_malformed_ids_in_body_fail_validation_instead_of_querying(): void
    {
        $this->actingAs($this->stafSid())
            ->postJson('/api/citizens', [
                'rt_id' => 'abc',
                'family_id' => 'bukan-uuid',
                'father_id' => 'bukan-uuid',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['rt_id', 'family_id', 'father_id']);
    }

    public function test_dashboard_letter_type_must_be_numeric_or_all(): void
    {
        $user = $this->stafSid();

        $this->actingAs($user)
            ->getJson('/api/dashboard/letter-stats?letter_type=abc')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['letter_type']);
    }
}
