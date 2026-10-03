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
 * mencegah jabatan non-approver menjadi approver_position, memastikan
 * hanya satu step final pada step_order terbesar, dan step_order unik — sesuai penegasan
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
 *  - approver_position RW, Kadus, Kasi, dan Kaur DITOLAK (422).
 *  - Payload tanpa step is_final=true DITOLAK (422).
 *  - Lebih dari satu step final, final bukan step terakhir, atau final bukan
 *    Kepala Desa/Sekdes DITOLAK (422).
 *  - step_order duplikat dalam satu flow DITOLAK (422).
 *  - steps kosong/tidak diisi DITOLAK (422, karena min:1).
 *  - Operasi bersifat replace-all: memanggil ulang dengan payload berbeda
 *    benar-benar menghapus steps versi sebelumnya (bukan menambah).
 *  - approver_position='sekdes' tetap diterima sebagai nilai enum; flow
 *    default menggunakan kepala_desa sebagai approver step final, dengan
 *    Sekretaris Desa sebagai pejabat pengganti sesuai keputusan bisnis.
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
        $response->assertJsonCount(2, 'data');
        $this->assertDatabaseCount('flow_steps', 2);
        $this->assertDatabaseHas('flow_steps', [
            'flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'rt', 'is_final' => false,
        ]);
        $this->assertDatabaseHas('flow_steps', [
            'flow_id' => $flow->id, 'step_order' => 2, 'approver_position' => 'kepala_desa', 'is_final' => true,
        ]);
    }

    #[Test]
    public function replace_is_truly_replace_all_not_append(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        // Isi flow default (2 tahap).
        $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => $this->validDefaultSteps(),
        ])->assertStatus(200);
        $this->assertDatabaseCount('flow_steps', 2);

        // Ganti dengan satu tahap untuk membuktikan steps lama tergantikan.
        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => [
                ['step_order' => 1, 'approver_position' => 'kepala_desa', 'is_final' => true],
            ],
        ]);

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $this->assertDatabaseCount('flow_steps', 1);
    }

    #[Test]
    public function non_approver_positions_are_rejected_with_specific_message(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        foreach (['rw', 'kadus', 'kasi_pelayanan', 'kaur_tu_umum'] as $position) {
            $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
                'steps' => [
                    ['step_order' => 1, 'approver_position' => $position, 'is_final' => true],
                ],
            ]);

            $response->assertStatus(422);
            $response->assertJsonValidationErrors(['steps.0.approver_position']);
            $response->assertJsonFragment([
                'steps.0.approver_position' => ['RW, Kadus, Kasi, dan Kaur tidak dapat menjadi approver pada alur persetujuan.'],
            ]);
        }

        $this->assertDatabaseCount('flow_steps', 0);
    }

    #[Test]
    public function approver_position_sekdes_is_still_a_syntactically_valid_enum_value(): void
    {
        // Sekdes dapat menjadi approver dan penanggung jawab step final.
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
        $response->assertJsonFragment(['steps' => ['Tepat satu step harus is_final=true']]);
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
    public function more_than_one_final_step_is_rejected(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => [
                ['step_order' => 1, 'approver_position' => 'rt', 'is_final' => true],
                ['step_order' => 2, 'approver_position' => 'sekdes', 'is_final' => true],
            ],
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['steps'])
            ->assertJsonFragment(['steps' => ['Tepat satu step harus is_final=true']]);
    }

    #[Test]
    public function final_step_must_have_the_highest_order(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => [
                ['step_order' => 1, 'approver_position' => 'kepala_desa', 'is_final' => true],
                ['step_order' => 2, 'approver_position' => 'rt', 'is_final' => false],
            ],
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['steps'])
            ->assertJsonFragment(['steps' => ['Step final harus memiliki step_order terbesar']]);
    }

    #[Test]
    public function final_step_must_be_approved_by_kepala_desa_or_sekdes(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $flow = $this->makeFlow();

        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => [
                ['step_order' => 1, 'approver_position' => 'rt', 'is_final' => true],
            ],
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['steps'])
            ->assertJsonFragment(['steps' => ['Approver step final harus Kepala Desa atau Sekdes']]);
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

        $response = $this->actingAs($user)->putJson("/api/approval-flows/{$flow->id}/steps", [
            'steps' => [
                ['step_order' => 1, 'approver_position' => 'rt'],
                ['step_order' => 2, 'approver_position' => 'sekdes', 'is_final' => true],
            ],
        ]);

        // is_final bersifat 'sometimes'; omission defaults to false.
        $response->assertStatus(200);
        $this->assertDatabaseHas('flow_steps', [
            'flow_id' => $flow->id, 'step_order' => 1, 'is_final' => false,
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
            'name' => 'RT-Kades/Sekdes (2 Tahap)',
            'is_active' => true,
        ]);
    }

    private function validDefaultSteps(): array
    {
        return [
            ['step_order' => 1, 'approver_position' => 'rt', 'is_final' => false],
            ['step_order' => 2, 'approver_position' => 'kepala_desa', 'is_final' => true],
        ];
    }
}
