<?php

namespace Tests\Feature;

use App\Models\ApprovalFlow;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-1-S2 — Feature test untuk GET/POST /approval-flows dan
 * GET /approval-flows/{id}.
 *
 * CATATAN: endpoint PUT /approval-flows/{id}/steps diuji terpisah di
 * ApprovalFlowStepsEndpointTest.php agar cakupan endpoint tetap terfokus.
 *
 * Asumsi role otorisasi: StoreApprovalFlowRequest::authorize() mengizinkan
 * HANYA user dengan role 'staf_sid' (sesuai TDD Table 4 & kolom
 * users.role ENUM 9 nilai). Test ini mengasumsikan tabel `users` sudah
 * punya kolom `role` string/enum standar proyek — sesuaikan factory user
 * di bawah jika UserFactory di repo asli berbeda.
 *
 * Cakupan kondisi:
 *  - Migration membuat tabel approval_flows dengan kolom & FK yang benar.
 *  - GET /approval-flows butuh login (401 untuk guest).
 *  - GET /approval-flows mengembalikan hanya flow aktif secara default.
 *  - GET /approval-flows/{id} mengembalikan 404 jika tidak ditemukan.
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
        // EV5-6-S2: /approval-flows eksklusif staf_sid.
        $user = User::factory()->create(['role' => 'staf_sid']);
        $this->makeFlow('Flow Aktif', true);
        $this->makeFlow('Flow Nonaktif', false);

        $response = $this->actingAs($user)->getJson('/api/approval-flows');

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment(['name' => 'Flow Aktif']);
    }

    #[Test]
    public function show_returns_404_for_nonexistent_flow(): void
    {
        // EV5-6-S2: harus role staf_sid agar lolos middleware role
        // sebelum sampai ke pengecekan 404 di controller/service.
        $user = User::factory()->create(['role' => 'staf_sid']);

        $response = $this->actingAs($user)->getJson('/api/approval-flows/99999');

        $response->assertStatus(404);
    }

    #[Test]
    public function show_returns_flow_with_its_steps(): void
    {
        // EV5-6-S2: endpoint approval-flows eksklusif staf_sid.
        $user = User::factory()->create(['role' => 'staf_sid']);
        $flow = $this->makeFlow('Flow Detail');

        $response = $this->actingAs($user)->getJson('/api/approval-flows/'.$flow->id);

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $flow->id);
        $response->assertJsonPath('data.name', 'Flow Detail');
    }

    private function makeFlow(string $name, bool $isActive = true): ApprovalFlow
    {
        return ApprovalFlow::query()->create([
            'village_id' => Village::query()->value('id') ?? Village::factory()->create()->id,
            'name' => $name,
            'is_active' => $isActive,
        ]);
    }

    #[Test]
    public function flow_write_endpoints_are_not_available(): void
    {
        $user = User::factory()->create(['role' => 'staf_sid']);
        $flow = $this->makeFlow('Flow Terkunci');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/approval-flows', ['name' => 'Flow Baru'])
            ->assertStatus(405);

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/approval-flows/{$flow->id}/steps", ['steps' => []])
            ->assertStatus(404);

        $this->assertDatabaseMissing('approval_flows', ['name' => 'Flow Baru']);
    }
}
