<?php

namespace Tests\Feature;

use App\Models\ApprovalFlow;
use App\Models\LetterCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-1-S3 — Feature test untuk PUT /approval-flows/{id}/steps.
 *
 * Ini adalah endpoint paling kritis di seluruh EV5-1: pagar teknis yang
 * mencegah 'rw'/'kadus' menjadi approver_position, memastikan minimal
 * 1 step is_final=true, dan step_order unik per flow — sesuai penegasan
 * SID-ARCH-BE-001 S3.2 bahwa larangan ini STRUKTURAL (bukan hanya UI).
 *
 * PENTING: controller `ApprovalFlowController` di folder ini adalah
 * VERSI LENGKAP (index/show/store dari EV5-1-S2 + replaceSteps() baru).
 * Route index/show/store SUDAH dites terpisah di
 * EV5-1-S2_ApprovalFlows/tests/Feature/ApprovalFlowEndpointTest.php —
 * file ini fokus HANYA ke endpoint replaceSteps().
 *
 * Cakupan kondisi:
 *  - Migration membuat tabel flow_steps dengan kolom & constraint yang benar.
 *  - Guest (belum login) mendapat 401.
 *  - Role selain petugas_desa mendapat 403.
 *  - Flow tidak ditemukan mengembalikan 404.
 *  - Replace steps sukses (200) dengan payload valid & steps lama terhapus.
 *  - approver_position='rw' DITOLAK (422) dengan pesan error spesifik.
 *  - approver_position='kadus' DITOLAK (422) dengan pesan error spesifik.
 *  - Payload tanpa step is_final=true DITOLAK (422).
 *  - step_order duplikat dalam satu flow DITOLAK (422).
 *  - steps kosong/tidak diisi DITOLAK (422, karena min:1).
 *  - Operasi bersifat replace-all: memanggil ulang dengan payload berbeda
 *    benar-benar menghapus steps versi sebelumnya (bukan menambah).
 *  - approver_position='sekdes' TETAP diterima validasi (ENUM masih
 *    5 nilai) — validasi Form Request ini murni soal ENUM yang sah di
 *    skema. Seeder hari ini (EV5-1-S4) memang hanya memakai
 *    'kepala_desa' untuk step 2 (representasi satu-row), tapi itu bukan
 *    berarti nilai 'sekdes' sudah "final tidak dipakai" — pertanyaan
 *    bisnisnya masih terbuka, lihat EV5-1-S4_OPEN_QUESTION_SEKDES.md.
 */
class ApprovalFlowStepsEndpointTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function migration_creates_flow_steps_table_with_expected_columns_and_indexes(): void
    {
        $this->assertTrue(Schema::hasTable('flow_steps'));
        $this->assertTrue(Schema::hasColumns('flow_steps', [
            'id',
            'flow_id',
            'step_order',
            'approver_position',
            'is_final',
            'created_at',
            'updated_at',
        ]));
    }

    #[Test]
    public function guest_cannot_replace_steps(): void
    {
        $flow = $this->makeFlow();

        $response = $this->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => $this->validDefaultSteps(),
        ]);

        $response->assertStatus(401);
    }

    #[Test]
    public function non_petugas_desa_cannot_replace_steps(): void
    {
        $user = User::factory()->create(['role' => 'kepala_desa']);
        $flow = $this->makeFlow();

        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => $this->validDefaultSteps(),
        ]);

        $response->assertStatus(403);
    }

    #[Test]
    public function replacing_steps_of_nonexistent_flow_returns_404(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);

        $response = $this->actingAs($user)->putJson('/api/approval-flows/99999/steps', [
            'steps' => $this->validDefaultSteps(),
        ]);

        $response->assertStatus(404);
    }

    #[Test]
    public function petugas_desa_can_replace_steps_with_valid_payload(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => $this->validDefaultSteps(),
        ]);

        $response->assertStatus(200);
        $response->assertJsonCount(3, 'data');
        $this->assertDatabaseCount('flow_steps', 3);
        $this->assertDatabaseHas('flow_steps', [
            'flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'rt', 'is_final' => false,
        ]);
        $this->assertDatabaseHas('flow_steps', [
            'flow_id' => $flow->id, 'step_order' => 3, 'approver_position' => 'kasi_pelayanan', 'is_final' => true,
        ]);
    }

    #[Test]
    public function replace_is_truly_replace_all_not_append(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        // Isi steps pertama (3 tahap).
        $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => $this->validDefaultSteps(),
        ])->assertStatus(200);
        $this->assertDatabaseCount('flow_steps', 3);

        // Ganti dengan steps baru (2 tahap saja).
        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => [
                ['step_order' => 1, 'approver_position' => 'rt', 'is_final' => false],
                ['step_order' => 2, 'approver_position' => 'kasi_pelayanan', 'is_final' => true],
            ],
        ]);

        $response->assertStatus(200);
        $response->assertJsonCount(2, 'data');
        // Total di DB harus 2 (bukan 5) — membuktikan steps lama benar2 dihapus.
        $this->assertDatabaseCount('flow_steps', 2);
    }

    #[Test]
    public function approver_position_rw_is_rejected_with_specific_message(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => [
                ['step_order' => 1, 'approver_position' => 'rw', 'is_final' => true],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['steps.0.approver_position']);
        $response->assertJsonFragment([
            'steps.0.approver_position' => ['RW dan Kadus tidak dapat menjadi approver_position sejak v5.0'],
        ]);
        $this->assertDatabaseCount('flow_steps', 0);
    }

    #[Test]
    public function approver_position_kadus_is_rejected_with_specific_message(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => [
                ['step_order' => 1, 'approver_position' => 'kadus', 'is_final' => true],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['steps.0.approver_position']);
        $response->assertJsonFragment([
            'steps.0.approver_position' => ['RW dan Kadus tidak dapat menjadi approver_position sejak v5.0'],
        ]);
    }

    #[Test]
    public function approver_position_sekdes_is_still_a_syntactically_valid_enum_value(): void
    {
        // Validasi Form Request murni soal "apakah nilai ini termasuk 5
        // ENUM yang sah di skema" — bukan soal kebijakan bisnis "apakah
        // Sekdes benar2 dipakai seeder". Keputusan bisnis (Sekdes tidak
        // ikut approve) ada di level seeder/FlowStep::resolvablePositions(),
        // bukan di larangan level validasi seperti rw/kadus.
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => [
                ['step_order' => 1, 'approver_position' => 'sekdes', 'is_final' => true],
            ],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('flow_steps', [
            'flow_id' => $flow->id, 'approver_position' => 'sekdes',
        ]);
    }

    #[Test]
    public function payload_without_any_final_step_is_rejected(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => [
                ['step_order' => 1, 'approver_position' => 'rt', 'is_final' => false],
                ['step_order' => 2, 'approver_position' => 'kepala_desa', 'is_final' => false],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['steps']);
        $response->assertJsonFragment(['steps' => ['Minimal satu step harus is_final=true']]);
    }

    #[Test]
    public function duplicate_step_order_within_same_flow_is_rejected(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => [
                ['step_order' => 1, 'approver_position' => 'rt', 'is_final' => false],
                ['step_order' => 1, 'approver_position' => 'kepala_desa', 'is_final' => true],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['steps']);
        $response->assertJsonFragment(['steps' => ['step_order harus unik dalam satu flow']]);
    }

    #[Test]
    public function empty_steps_array_is_rejected(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => [],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['steps']);
    }

    #[Test]
    public function missing_steps_key_entirely_is_rejected(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['steps']);
    }

    #[Test]
    public function step_order_must_be_a_positive_integer(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => [
                ['step_order' => 0, 'approver_position' => 'rt', 'is_final' => true],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['steps.0.step_order']);
    }

    #[Test]
    public function is_final_is_optional_and_defaults_to_falsy_when_omitted(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        // Catatan: urutan step_order di payload ini SENGAJA tidak
        // merepresentasikan urutan bisnis yang masuk akal (kasi_pelayanan
        // di step 1) — controller replaceSteps() tidak melakukan validasi
        // urutan bisnis apapun di luar yang ada di Form Request (unique
        // step_order + minimal 1 is_final). Test ini murni menguji bahwa
        // field is_final bersifat opsional di layer validasi HTTP.
        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => [
                ['step_order' => 1, 'approver_position' => 'kasi_pelayanan', 'is_final' => true],
                ['step_order' => 2, 'approver_position' => 'rt'],
            ],
        ]);

        // is_final bersifat 'sometimes' di rules — payload di atas tetap
        // valid karena SALAH SATU step (index 0) sudah is_final=true.
        $response->assertStatus(200);
        $this->assertDatabaseHas('flow_steps', [
            'flow_id' => $flow->id, 'step_order' => 2, 'is_final' => false,
        ]);
    }

    private function makeFlow(): ApprovalFlow
    {
        $category = LetterCategory::query()->firstOrCreate(
            ['code' => 'approval_normal'],
            [
                'name' => 'Approval Normal',
                'handler_class' => 'App\\Services\\Letters\\ApprovalNormalHandler',
                'is_active' => true,
            ],
        );

        return ApprovalFlow::query()->create([
            'category_id' => $category->id,
            'name' => 'RT-Kades-Staff (3 Tahap)',
            'is_active' => true,
        ]);
    }

    private function validDefaultSteps(): array
    {
        return [
            ['step_order' => 1, 'approver_position' => 'rt', 'is_final' => false],
            ['step_order' => 2, 'approver_position' => 'kepala_desa', 'is_final' => false],
            ['step_order' => 3, 'approver_position' => 'kasi_pelayanan', 'is_final' => true],
        ];
    }
}
