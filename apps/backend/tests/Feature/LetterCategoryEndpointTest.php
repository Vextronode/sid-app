<?php

namespace Tests\Feature;

use App\Models\LetterCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-1-S1 — Feature test untuk GET /letter-categories.
 *
 * Cakupan kondisi:
 *  - Migration benar-benar membuat tabel `letter_categories` dengan kolom
 *    yang sesuai TDD Table 33 / migration EV5-1-S1.
 *  - Endpoint mengembalikan 401 jika belum login (Sanctum).
 *  - Endpoint mengembalikan 200 + seluruh data (termasuk yang nonaktif)
 *    saat user sudah login — sesuai LetterCategoryRepository::all().
 *  - Endpoint mengembalikan array kosong saat tabel belum ada isinya.
 *  - Kolom `code` di database benar-benar unique (constraint level DB).
 */
class LetterCategoryEndpointTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function migration_creates_letter_categories_table_with_expected_columns(): void
    {
        $this->assertTrue(Schema::hasTable('letter_categories'));
        $this->assertTrue(Schema::hasColumns('letter_categories', [
            'id',
            'code',
            'name',
            'description',
            'handler_class',
            'is_active',
            'created_at',
            'updated_at',
        ]));
    }

    #[Test]
    public function guest_cannot_access_letter_categories_endpoint(): void
    {
        $response = $this->getJson('/api/letter-categories');

        $response->assertStatus(401);
    }

    #[Test]
    public function authenticated_user_receives_all_categories_including_inactive_ones(): void
    {
        $user = User::factory()->create();

        LetterCategory::query()->create([
            'code' => 'approval_normal',
            'name' => 'Approval Normal',
            'handler_class' => 'App\\Services\\Letters\\ApprovalNormalHandler',
            'is_active' => true,
        ]);
        LetterCategory::query()->create([
            'code' => 'upload_mandiri',
            'name' => 'Upload Mandiri',
            'handler_class' => 'App\\Services\\Letters\\UploadMandiriHandler',
            'is_active' => false,
        ]);

        $response = $this->actingAs($user)->getJson('/api/letter-categories');

        $response->assertStatus(200);
        $response->assertJsonCount(2, 'data');
        $response->assertJsonFragment(['code' => 'approval_normal']);
        $response->assertJsonFragment(['code' => 'upload_mandiri']);
    }

    #[Test]
    public function endpoint_returns_empty_array_when_no_category_seeded(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/letter-categories');

        $response->assertStatus(200);
        $response->assertExactJson(['data' => []]);
    }

    #[Test]
    public function code_column_is_unique_at_database_level(): void
    {
        LetterCategory::query()->create([
            'code' => 'approval_normal',
            'name' => 'Approval Normal',
            'handler_class' => 'App\\Services\\Letters\\ApprovalNormalHandler',
            'is_active' => true,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        LetterCategory::query()->create([
            'code' => 'approval_normal',
            'name' => 'Duplikat',
            'handler_class' => 'App\\Services\\Letters\\DuplikatHandler',
            'is_active' => true,
        ]);
    }

    #[Test]
    public function is_active_column_is_cast_to_boolean(): void
    {
        $category = LetterCategory::query()->create([
            'code' => 'approval_normal',
            'name' => 'Approval Normal',
            'handler_class' => 'App\\Services\\Letters\\ApprovalNormalHandler',
            'is_active' => 1,
        ]);

        $this->assertIsBool($category->fresh()->is_active);
        $this->assertTrue($category->fresh()->is_active);
    }
}
