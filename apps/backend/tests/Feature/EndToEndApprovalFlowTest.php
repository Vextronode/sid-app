<?php

namespace Tests\Feature;

use App\Enums\LetterFlowLogReason;
use App\Models\ApprovalFlow;
use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Hamlet;
use App\Models\Letter;
use App\Models\LetterCategory;
use App\Models\LetterType;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use App\Notifications\LetterStatusNotification;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Tests\TestCase;

class EndToEndApprovalFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
    }

    public function test_warga_letter_flows_from_rt_to_kades_and_is_available_to_assigned_kasi(): void
    {
        $village = Village::factory()->create();
        ['rw' => $rw, 'rt' => $rt] = $this->makeArea($village);
        $applicant = $this->makeCitizenAccount($village, $rt, 'warga');
        $rtApprover = $this->makeOfficialUser('rt', $village, ['rt_id' => $rt->id]);
        $rwUser = $this->makeOfficialUser('rw', $village, ['rw_id' => $rw->id]);
        $kades = $this->makeOfficialUser('kepala_desa', $village);
        $kasi = $this->makeOfficialUser('kasi_pelayanan', $village);
        $otherKasi = $this->makeOfficialUser('kaur_tu_umum', $village);
        $flow = $this->makeFlow([
            ['position' => 'rt', 'final' => false],
            ['position' => 'kepala_desa', 'final' => true],
        ]);
        $letterType = LetterType::factory()->create([
            'flow_id' => $flow->id,
            'assigned_role' => 'kasi_pelayanan',
            'template' => 'Surat {{ applicant_name }}',
        ]);

        $submission = $this->actingAs($applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $letterType->id,
                'purpose' => 'Keperluan administrasi',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $letterId = $submission->json('data.id');
        $letter = Letter::query()->findOrFail($letterId);

        $this->actingAs($rtApprover['user'])
            ->patchJson("/api/rt/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();

        Notification::assertSentTo(
            $rwUser['user'],
            LetterStatusNotification::class,
            fn (LetterStatusNotification $notification): bool => $notification->toArray($rwUser['user'])['context']['status'] === 'rt_approved_rw_fyi',
        );

        $this->actingAs($kades['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();

        $letter->refresh();
        $this->assertSame('approved', $letter->status->value);
        $this->assertNotEmpty($letter->letter_number);
        Notification::assertSentTo(
            $kasi['user'],
            LetterStatusNotification::class,
            fn (LetterStatusNotification $notification): bool => $notification->toArray($kasi['user'])['context']['status'] === 'letter_ready_for_print',
        );
        Notification::assertNotSentTo($otherKasi['user'], LetterStatusNotification::class);

        $this->actingAs($applicant['user'])
            ->get("/api/letters/{$letterId}/download")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->actingAs($kasi['user'])
            ->get("/api/letters/{$letterId}/download")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->actingAs($otherKasi['user'])
            ->getJson("/api/letters/{$letterId}/download")
            ->assertForbidden();
    }

    public function test_rt_applicant_skips_own_step_and_rw_receives_no_fyi(): void
    {
        $village = Village::factory()->create();
        ['rw' => $rw, 'rt' => $rt] = $this->makeArea($village);
        $applicant = $this->makeCitizenAccount($village, $rt, 'rt');
        $rtOfficial = $this->makeOfficial($applicant['user'], 'rt', $village, ['rt_id' => $rt->id]);
        $rwUser = $this->makeOfficialUser('rw', $village, ['rw_id' => $rw->id]);
        $kades = $this->makeOfficialUser('kepala_desa', $village);
        $flow = $this->makeFlow([
            ['position' => 'rt', 'final' => false],
            ['position' => 'kepala_desa', 'final' => true],
        ]);
        $letterType = LetterType::factory()->create([
            'flow_id' => $flow->id,
            'template' => 'Surat {{ applicant_name }}',
        ]);

        $submission = $this->actingAs($applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $letterType->id,
                'purpose' => 'Keperluan administrasi',
            ])
            ->assertCreated();

        $letter = Letter::query()->findOrFail($submission->json('data.id'));
        $this->assertSame(2, $letter->current_step_order);
        $this->assertDatabaseHas('letter_status_logs', [
            'letter_id' => $letter->id,
            'actor_id' => $applicant['user']->id,
            'reason' => LetterFlowLogReason::RtStageSkippedForOfficialApplicant->value,
        ]);

        $this->actingAs($kades['user'])
            ->getJson('/api/kades/letters')
            ->assertOk()
            ->assertJsonFragment(['id' => $letter->id]);

        $this->actingAs($kades['user'])
            ->getJson("/api/kades/letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $letter->id);

        $this->actingAs($kades['user'])
            ->patchJson("/api/kades/letters/{$letter->id}/decision", ['status' => 'approved'])
            ->assertOk();

        Notification::assertNotSentTo($rwUser['user'], LetterStatusNotification::class);
        $this->assertTrue($rtOfficial->fresh()->is_active);
    }

    public function test_kades_applicant_cannot_approve_own_letter_and_sekdes_can(): void
    {
        $village = Village::factory()->create();
        $applicant = $this->makeCitizenAccount($village, null, 'kepala_desa');
        $kadesOfficial = $this->makeOfficial($applicant['user'], 'kepala_desa', $village);
        $sekdes = $this->makeOfficialUser('sekdes', $village);
        $flow = $this->makeFlow([
            ['position' => 'kepala_desa', 'final' => true],
        ]);
        $letterType = LetterType::factory()->create([
            'flow_id' => $flow->id,
            'template' => 'Surat {{ applicant_name }}',
        ]);

        $submission = $this->actingAs($applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $letterType->id,
                'purpose' => 'Keperluan administrasi',
            ])
            ->assertCreated();
        $letterId = $submission->json('data.id');

        $this->actingAs($applicant['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Anda tidak dapat memutuskan surat milik Anda sendiri.');

        $this->actingAs($sekdes['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();

        $this->assertDatabaseHas('letter_approvals', [
            'letter_id' => $letterId,
            'approved_by' => $sekdes['user']->id,
            'approval_level' => 'sekdes',
            'action' => 'approved',
        ]);
        $this->assertSame('approved', Letter::query()->findOrFail($letterId)->status->value);
        $this->assertTrue($kadesOfficial->fresh()->is_active);
        $this->assertPdfUsesKades(
            Letter::query()->findOrFail($letterId),
            $applicant['user'],
            $kadesOfficial,
        );
    }

    public function test_sekdes_can_approve_kepala_desa_final_step_and_pdf_keeps_kades_signature(): void
    {
        $village = Village::factory()->create();
        $applicant = $this->makeCitizenAccount($village, null, 'warga');
        $kades = $this->makeOfficialUser('kepala_desa', $village);
        $sekdes = $this->makeOfficialUser('sekdes', $village);
        $flow = $this->makeFlow([
            ['position' => 'kepala_desa', 'final' => true],
        ]);
        $letterType = LetterType::factory()->create([
            'flow_id' => $flow->id,
            'template' => 'Surat {{ applicant_name }}',
        ]);

        $submission = $this->actingAs($applicant['user'])
            ->postJson('/api/letters', [
                'letter_type_id' => $letterType->id,
                'purpose' => 'Keperluan administrasi',
            ])
            ->assertCreated();
        $letterId = $submission->json('data.id');

        $this->actingAs($sekdes['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();

        $this->assertDatabaseHas('letter_approvals', [
            'letter_id' => $letterId,
            'approved_by' => $sekdes['user']->id,
            'approval_level' => 'sekdes',
            'action' => 'approved',
        ]);
        $this->assertSame('approved', Letter::query()->findOrFail($letterId)->status->value);

        $this->assertPdfUsesKades(
            Letter::query()->findOrFail($letterId),
            $applicant['user'],
            $kades['official'],
        );
    }

    public function test_petugas_can_promote_and_demote_rt_but_cannot_demote_self(): void
    {
        $village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($village);
        $petugas = $this->makeOfficialUser('petugas_desa', $village);
        $target = $this->makeCitizenAccount($village, $rt, 'warga');

        $promotion = $this->actingAs($petugas['user'])
            ->postJson('/api/officials/promote', [
                'user_id' => $target['user']->id,
                'position' => 'rt',
                'rt_id' => $rt->id,
                'started_at' => today()->toDateString(),
            ])
            ->assertCreated()
            ->assertJsonPath('data.position', 'rt')
            ->assertJsonPath('data.user_id', $target['user']->id);

        $officialId = $promotion->json('data.id');
        $this->assertSame('rt', $target['user']->fresh()->role);

        $this->actingAs($petugas['user'])
            ->postJson("/api/officials/{$officialId}/demote")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);
        $this->assertSame('warga', $target['user']->fresh()->role);

        $this->actingAs($petugas['user'])
            ->postJson("/api/officials/{$petugas['official']->id}/demote")
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'Aksi gagal karena Anda adalah petugas tersisa. Petugas desa tidak boleh kosong.',
            );
    }

    public function test_registration_username_can_be_changed_and_used_for_login(): void
    {
        $citizen = Citizen::factory()->create([
            'nik' => '3201012345679991',
            'name' => 'Siti Aminah',
        ]);

        $registration = $this->postJson('/register', [
            'nik' => '3201012345679991',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
        ])->assertCreated()
            ->assertJsonPath('data.name', $citizen->name);

        $oldUsername = $registration->json('data.username');
        $this->assertMatchesRegularExpression('/^siti\.\d{4}$/', $oldUsername);

        Auth::shouldUse('web');
        Auth::guard('web')->logout();
        $this->assertGuest('web');
        $this->postJson('/login', [
            'username' => $oldUsername,
            'password' => 'RahasiaAman123!',
        ])->assertOk();

        $newUsername = 'siti.namabaru';
        $this->patchJson('/api/profile', ['username' => $newUsername])
            ->assertOk()
            ->assertJsonPath('user.username', $newUsername);

        Auth::shouldUse('web');
        Auth::guard('web')->logout();
        $this->assertGuest('web');
        $this->post('/login', [
            'username' => $oldUsername,
            'password' => 'RahasiaAman123!',
        ])->assertRedirect()->assertSessionHasErrors('username');

        $this->postJson('/login', [
            'username' => $newUsername,
            'password' => 'RahasiaAman123!',
        ])->assertOk();
    }

    /**
     * @param  array<int, array{position: string, final: bool}>  $steps
     */
    private function makeFlow(array $steps): ApprovalFlow
    {
        $flow = ApprovalFlow::factory()->create([
            'category_id' => LetterCategory::factory(),
        ]);

        foreach ($steps as $index => $step) {
            FlowStep::factory()->create([
                'flow_id' => $flow->id,
                'step_order' => $index + 1,
                'approver_position' => $step['position'],
                'is_final' => $step['final'],
            ]);
        }

        return $flow;
    }

    /**
     * @return array{rw: Rw, rt: Rt}
     */
    private function makeArea(Village $village): array
    {
        $hamlet = Hamlet::factory()->create(['village_id' => $village->id]);
        $rw = Rw::factory()->create([
            'hamlet_id' => $hamlet->id,
            'village_id' => $village->id,
        ]);
        $rt = Rt::factory()->create([
            'rw_id' => $rw->id,
            'village_id' => $village->id,
        ]);

        return compact('rw', 'rt');
    }

    /**
     * @return array{user: User, citizen: Citizen}
     */
    private function makeCitizenAccount(Village $village, ?Rt $rt, string $role): array
    {
        $citizen = Citizen::factory()->create([
            'village_id' => $village->id,
            'rt_id' => $rt?->id,
        ]);
        $user = User::factory()->create([
            'role' => $role,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        return compact('user', 'citizen');
    }

    /**
     * @return array{user: User, official: Official, citizen: Citizen}
     */
    private function makeOfficialUser(string $position, Village $village, array $area = []): array
    {
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $role = match ($position) {
            'sekdes' => 'sekretaris_desa',
            default => $position,
        };
        $user = User::factory()->create([
            'role' => $role,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);
        $official = $this->makeOfficial($user, $position, $village, [
            'citizen_id' => $citizen->id,
            ...$area,
        ]);

        return compact('user', 'official', 'citizen');
    }

    private function makeOfficial(User $user, string $position, Village $village, array $attributes = []): Official
    {
        return Official::factory()
            ->forUser($user)
            ->position($position)
            ->create([
                'village_id' => $village->id,
                ...$attributes,
            ]);
    }

    private function assertPdfUsesKades(Letter $letter, User $user, Official $kades): void
    {
        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('download')
            ->once()
            ->andReturn(new Response('', 200, ['Content-Type' => 'application/pdf']));
        Pdf::shouldReceive('loadView')
            ->once()
            ->with('pdf.templates.wet', Mockery::on(
                fn (array $data): bool => $data['kades']->is($kades),
            ))
            ->andReturn($pdf);

        $this->actingAs($user)
            ->get("/api/letters/{$letter->id}/download")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }
}
