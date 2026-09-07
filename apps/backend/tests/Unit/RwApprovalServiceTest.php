<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Repositories\LetterApprovalRepository;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use App\Services\OfficialService;
use App\Services\RwApprovalService;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RwApprovalServiceTest extends TestCase
{
    use RefreshDatabase;

    private RwApprovalService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new RwApprovalService(
            new OfficialService(new OfficialRepository, new UserRepository),
            new LetterRepository,
            new OfficialRepository,
            new LetterApprovalRepository,
        );
    }

    public function test_approve_throws_403_when_letter_not_rt_approved_yet(): void
    {
        $letter = Letter::factory()->create(['status' => 'pending']);
        $user = User::factory()->create();

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Surat belum dapat diproses oleh RW.');

        $this->service->approve($letter, $user, ['status' => 'approved']);
    }

    public function test_approve_throws_403_when_rw_mismatch(): void
    {
        $rwOwner = Rw::factory()->create();
        $rwOther = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rwOwner->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'rt_approved']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rwOther->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Anda tidak berwenang memproses surat ini.');

        $this->service->approve($letter, $user->fresh(), ['status' => 'approved']);
    }

    public function test_approve_fails_with_query_exception_when_pending_rw_approval_exists(): void
    {
        Notification::fake();

        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'rt_approved']);
        $letter->approvals()->create(['approval_level' => 'rw', 'deadline_at' => now()->addDays(2)]);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $this->expectException(QueryException::class);

        $this->service->approve($letter, $user->fresh(), ['status' => 'approved']);
    }

    public function test_approve_succeeds_when_no_pending_rw_approval_exists(): void
    {
        Notification::fake();

        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'rt_approved']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $this->service->approve($letter, $user->fresh(), ['status' => 'approved']);

        $this->assertDatabaseHas('letters', ['id' => $letter->id, 'status' => 'rw_approved']);
    }

    public function test_get_pending_letters_scopes_to_own_rw(): void
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'rt_approved']);
        Letter::factory()->create();

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $result = $this->service->getPendingLetters($user->fresh());

        $this->assertCount(1, $result);
        $this->assertSame($letter->id, $result->first()->id);
    }
}
