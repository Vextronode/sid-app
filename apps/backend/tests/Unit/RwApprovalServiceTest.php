<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Repositories\LetterRepository;
use App\Services\RwApprovalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class RwApprovalServiceTest extends TestCase
{
    use RefreshDatabase;

    private RwApprovalService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new RwApprovalService(
            new LetterRepository,
        );
    }

    /**
     * Pastikan RwApprovalService memang tidak lagi punya method
     * approve()/decision() apapun — RW murni notifier read-only, bukan
     * approver yang "sudah di-guard" tapi method-nya masih ada.
     */
    public function test_service_has_no_approve_or_decision_method(): void
    {
        $this->assertFalse(method_exists($this->service, 'approve'));
        $this->assertFalse(method_exists($this->service, 'decision'));
    }

    public function test_get_pending_letters_returns_letters_in_same_rw(): void
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);

        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $result = $this->service->getPendingLetters($user->fresh());

        $this->assertCount(1, $result);
        $this->assertSame($letter->id, $result->first()->id);
    }

    public function test_get_pending_letters_excludes_letters_outside_rw(): void
    {
        $rw = Rw::factory()->create();
        $otherRw = Rw::factory()->create();
        $otherRt = Rt::factory()->create(['rw_id' => $otherRw->id]);
        $otherCitizen = Citizen::factory()->create(['rt_id' => $otherRt->id]);

        Letter::factory()->create(['citizen_id' => $otherCitizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $result = $this->service->getPendingLetters($user->fresh());

        $this->assertCount(0, $result);
    }

    public function test_get_pending_letters_excludes_approved_and_rejected(): void
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);

        // Dibuat lewat factory seperti biasa (status default 'pending',
        // supaya semua kolom computed/hashed terisi benar oleh model
        // event), lalu kolom status di-patch langsung lewat query
        // builder tanpa pernah menghidrasi ulang ke model. Ini
        // menghindari App\Enums\LetterStatus (enum granular lama)
        // melempar ValueError saat Letter->status diakses — enum itu
        // TIDAK memiliki case 'approved'/'rejected' yang valid di sisi
        // DB CHECK constraint. Yang diuji di sini murni perilaku query
        // repository (filter status), bukan hydration model.
        $approvedLetter = Letter::factory()->create(['citizen_id' => $citizen->id]);
        DB::table('letters')
            ->where('id', $approvedLetter->id)
            ->update(['status' => 'approved']);

        $rejectedLetter = Letter::factory()->create(['citizen_id' => $citizen->id]);
        DB::table('letters')
            ->where('id', $rejectedLetter->id)
            ->update(['status' => 'rejected']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $result = $this->service->getPendingLetters($user->fresh());

        $this->assertCount(0, $result);
    }

    public function test_get_pending_letters_aborts_when_user_has_no_official(): void
    {
        $user = User::factory()->create(['role' => 'rw']);

        $this->expectException(HttpException::class);

        $this->service->getPendingLetters($user);
    }

    public function test_get_pending_letters_aborts_when_official_has_no_rw(): void
    {
        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => null]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $this->expectException(HttpException::class);

        $this->service->getPendingLetters($user->fresh());
    }

    public function test_get_letter_detail_returns_letter_within_rw_scope(): void
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $result = $this->service->getLetterDetail($letter, $user->fresh());

        $this->assertSame($letter->id, $result->id);
    }

    public function test_get_letter_detail_forbidden_for_letter_outside_rw(): void
    {
        $rw = Rw::factory()->create();
        $otherRw = Rw::factory()->create();
        $otherRt = Rt::factory()->create(['rw_id' => $otherRw->id]);
        $otherCitizen = Citizen::factory()->create(['rt_id' => $otherRt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $otherCitizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $this->expectException(HttpException::class);

        $this->service->getLetterDetail($letter, $user->fresh());
    }

    public function test_get_letter_detail_aborts_when_user_has_no_official(): void
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);

        $user = User::factory()->create(['role' => 'rw']);

        $this->expectException(HttpException::class);

        $this->service->getLetterDetail($letter, $user);
    }
}
