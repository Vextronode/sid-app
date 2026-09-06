<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Repositories\LetterRepository;
use App\Services\OfficialService;
use App\Services\RtApprovalService;
use HttpException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RtApprovalServiceTest extends TestCase
{
    use RefreshDatabase;

    private RtApprovalService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new RtApprovalService(
            new OfficialService(new OfficialRepository, new UserRepository),
            new LetterRepository,
            new OfficialRepository,
        );
    }

    public function test_get_pending_letters_throws_403_when_official_missing(): void
    {
        $user = User::factory()->create(['role' => 'rt']);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Data official tidak ditemukan.');

        $this->service->getPendingLetters($user);
    }

    public function test_get_pending_letters_scopes_to_own_rt_and_relevant_statuses(): void
    {
        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $matchingLetter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);
        Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'kasi_approved']);
        Letter::factory()->create();

        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id]);
        $user = User::factory()->create(['role' => 'rt']);
        $user->official()->save($official);

        $result = $this->service->getPendingLetters($user->fresh());

        $this->assertCount(1, $result);
        $this->assertSame($matchingLetter->id, $result->first()->id);
    }

    public function test_decision_approve_updates_letter_and_creates_rw_approval(): void
    {
        Notification::fake();

        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rt']);
        $user->official()->save($official);

        $this->service->decision($letter, $user->fresh(), ['status' => 'approved']);

        $this->assertDatabaseHas('letters', ['id' => $letter->id, 'status' => 'rt_approved']);
        $this->assertDatabaseHas('letter_approvals', [
            'letter_id' => $letter->id,
            'approval_level' => 'rw',
            'approved_by' => null,
        ]);
        $this->assertDatabaseHas('letter_status_logs', [
            'letter_id' => $letter->id,
            'old_status' => 'pending',
            'new_status' => 'rt_approved',
        ]);
    }

    public function test_decision_reject_requires_notes(): void
    {
        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id]);
        $user = User::factory()->create(['role' => 'rt']);
        $user->official()->save($official);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Alasan penolakan wajib diisi.');

        $this->service->decision($letter, $user->fresh(), ['status' => 'rejected']);
    }

    public function test_decision_forbidden_when_rt_mismatch(): void
    {
        $rtOwner = Rt::factory()->create();
        $rtOther = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rtOwner->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rtOther->id]);
        $user = User::factory()->create(['role' => 'rt']);
        $user->official()->save($official);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Anda tidak berwenang memproses surat ini.');

        $this->service->decision($letter, $user->fresh(), ['status' => 'approved']);
    }
}
