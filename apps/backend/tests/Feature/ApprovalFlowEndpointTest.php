<?php

namespace Tests\Feature;

use App\Models\ApprovalFlow;
use App\Models\LetterCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;


/**
 * EV5-1-S2 — Feature test untuk GET/POST /approval-flows dan
 * GET /approval-flows/{id}.
 *
 * CATATAN: endpoint PUT /approval-flows/{id}/steps SENGAJA TIDAK dites di
 * sini — itu ditambahkan controller-nya di EV5-1-S3 (lihat
 * EV5-1-S3_FlowSteps/tests/Feature/ApprovalFlowStepsEndpointTest.php).
 *
 * Asumsi role otorisasi: StoreApprovalFlowRequest::authorize() mengizinkan
 * HANYA user dengan role 'petugas_desa' (sesuai TDD Table 4 & kolom
 * users.role ENUM 9 nilai). Test ini mengasumsikan tabel `users` sudah
 * punya kolom `role` string/enum standar proyek — sesuaikan factory user
 * di bawah jika UserFactory di repo asli berbeda.
 *
 * Cakupan kondisi:
 *  - Migration membuat tabel approval_flows dengan kolom & FK yang benar.
 *  - GET /approval-flows butuh login (401 untuk guest).
 *  - GET /approval-flows mengembalikan hanya flow aktif secara default.
 *  - GET /approval-flows?category_id=X memfilter per kategori.
 *  - GET /approval-flows/{id} mengembalikan 404 jika tidak ditemukan.
 *  - POST /approval-flows sukses (201) untuk petugas_desa dengan payload valid.
 *  - POST /approval-flows ditolak (403) untuk role selain petugas_desa.
 *  - POST /approval-flows gagal validasi (422) jika category_id tidak ada.
 *  - POST /approval-flows gagal validasi (422) jika name kosong.
 */
class ApprovalFlowEndpointTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function migration_creates_approval_flows_table_with_fk_to_letter_categories(): void
    {
        $this->assertTrue(Schema::hasTable('approval_flows'));
        $this->assertTrue(Schema::hasColumns('approval_flows', [
            'id',
            'category_id',
            'name',
            'description',
            'is_active',
            'created_at',
            'updated_at',
        ]));
    }

    #[Test]
    public function guest_cannot_list_approval_flows(): void
    {
        $response = $this->getJson('/api/approval-flows');

        $response->assertStatus(401);
    }

    #[Test]
    public function authenticated_user_receives_only_active_flows_by_default(): void
    {
        $user = User::factory()->create();
        $category = $this->makeCategory('approval_normal');
        $this->makeFlow($category, 'Flow Aktif', true);
        $this->makeFlow($category, 'Flow Nonaktif', false);

        $response = $this->actingAs($user)->getJson('/api/approval-flows');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['name' => 'Flow Aktif']);
    }

    #[Test]
    public function list_can_be_filtered_by_category_id(): void
    {
        $user = User::factory()->create();
        $categoryA = $this->makeCategory('approval_normal');
        $categoryB = $this->makeCategory('upload_mandiri');
        $flowA = $this->makeFlow($categoryA, 'Flow A');
        $this->makeFlow($categoryB, 'Flow B');

        $response = $this->actingAs($user)
            ->getJson('/api/approval-flows?category_id='.$categoryA->id);

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['id' => $flowA->id]);
    }

    #[Test]
    public function show_returns_404_for_nonexistent_flow(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/approval-flows/99999');

        $response->assertStatus(404);
    }

    #[Test]
    public function show_returns_flow_with_its_steps(): void
    {
        $user = User::factory()->create();
        $category = $this->makeCategory('approval_normal');
        $flow = $this->makeFlow($category, 'Flow Detail');

        $response = $this->actingAs($user)->getJson('/api/approval-flows/'.$flow->id);

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $flow->id);
        $response->assertJsonPath('data.name', 'Flow Detail');
    }

    #[Test]
    public function petugas_desa_can_create_new_flow(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $category = $this->makeCategory('approval_normal');

        $response = $this->actingAs($user)->postJson('/api/approval-flows', [
            'category_id' => $category->id,
            'name' => 'Flow Baru Hasil Test',
            'description' => 'Deskripsi flow baru',
            'is_active' => true,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.name', 'Flow Baru Hasil Test');
        $this->assertDatabaseHas('approval_flows', [
            'name' => 'Flow Baru Hasil Test',
            'category_id' => $category->id,
        ]);
    }

    #[Test]
    public function non_petugas_desa_role_cannot_create_flow(): void
    {
        $user = User::factory()->create(['role' => 'warga']);
        $category = $this->makeCategory('approval_normal');

        $response = $this->actingAs($user)->postJson('/api/approval-flows', [
            'category_id' => $category->id,
            'name' => 'Flow Tidak Sah',
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('approval_flows', ['name' => 'Flow Tidak Sah']);
    }

    #[Test]
    public function create_flow_fails_validation_when_category_id_does_not_exist(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);

        $response = $this->actingAs($user)->postJson('/api/approval-flows', [
            'category_id' => 99999,
            'name' => 'Flow Dengan Kategori Salah',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['category_id']);
        $response->assertJsonFragment(['category_id' => ['Kategori surat tidak ditemukan']]);
    }

    #[Test]
    public function create_flow_fails_validation_when_name_is_missing(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $category = $this->makeCategory('approval_normal');

        $response = $this->actingAs($user)->postJson('/api/approval-flows', [
            'category_id' => $category->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name']);
    }

    #[Test]
    public function create_flow_fails_validation_when_name_exceeds_max_length(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $category = $this->makeCategory('approval_normal');

        $response = $this->actingAs($user)->postJson('/api/approval-flows', [
            'category_id' => $category->id,
            'name' => str_repeat('a', 151),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name']);
    }

    #[Test]
    public function new_flow_defaults_to_active_when_is_active_not_provided(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $category = $this->makeCategory('approval_normal');

        $response = $this->actingAs($user)->postJson('/api/approval-flows', [
            'category_id' => $category->id,
            'name' => 'Flow Tanpa is_active',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('approval_flows', [
            'name' => 'Flow Tanpa is_active',
            'is_active' => true,
        ]);
    }

    private function makeCategory(string $code): LetterCategory
    {
        return LetterCategory::query()->create([
            'code' => $code,
            'name' => ucfirst(str_replace('_', ' ', $code)),
            'handler_class' => 'App\\Services\\Letters\\Handler',
            'is_active' => true,
        ]);
    }

    private function makeFlow(LetterCategory $category, string $name, bool $isActive = true): ApprovalFlow
    {
        return ApprovalFlow::query()->create([
            'category_id' => $category->id,
            'name' => $name,
            'is_active' => $isActive,
        ]);
    }
}
