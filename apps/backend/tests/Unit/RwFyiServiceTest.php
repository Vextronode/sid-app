<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use App\Services\OfficialService;
use App\Services\RwFyiService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class RwFyiServiceTest extends TestCase
{
    use RefreshDatabase;

    private RwFyiService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new RwFyiService(
            new LetterRepository,
            new OfficialService(new OfficialRepository, new UserRepository, new LetterRepository),
        );
    }

    /**
     * Pastikan RwFyiService memang tidak lagi punya method
     * approve()/decision() apapun — RW murni notifier read-only, bukan
     * approver yang "sudah di-guard" tapi method-nya masih ada.
     */
    public function test_service_has_no_approve_or_decision_method(): void
    {
        $this->assertFalse(method_exists($this->service, 'approve'));
        $this->assertFalse(method_exists($this->service, 'decision'));
    }

    public function test_get_history_letters_returns_letters_in_same_rw(): void
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);

        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $result = $this->service->getFyiLetters($user->fresh());

        $this->assertCount(1, $result);
        $this->assertSame($letter->id, $result->first()->id);
    }

    public function test_get_history_letters_excludes_letters_outside_rw(): void
    {
        $rw = Rw::factory()->create();
        $otherRw = Rw::factory()->create();
        $otherRt = Rt::factory()->create(['rw_id' => $otherRw->id]);
        $otherCitizen = Citizen::factory()->create(['rt_id' => $otherRt->id]);

        Letter::factory()->create(['citizen_id' => $otherCitizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $result = $this->service->getFyiLetters($user->fresh());

        $this->assertCount(0, $result);
    }

    public function test_get_history_letters_includes_all_statuses(): void
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);

        $statuses = ['pending', 'in_progress', 'approved', 'rejected'];
        $letters = collect($statuses)->map(
            fn (string $status) => Letter::factory()->create([
                'citizen_id' => $citizen->id,
                'status' => $status,
            ])
        );

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $result = $this->service->getFyiLetters($user->fresh());

        $this->assertCount(4, $result);
        $this->assertEqualsCanonicalizing(
            $letters->pluck('id')->all(),
            $result->pluck('id')->all()
        );
    }

    public function test_get_history_letters_aborts_when_user_has_no_official(): void
    {
        $user = User::factory()->create(['role' => 'rw']);

        $this->expectException(ModelNotFoundException::class);

        $this->service->getFyiLetters($user);
    }

    public function test_get_history_letters_aborts_when_official_has_no_rw(): void
    {
        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => null]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $this->expectException(HttpException::class);

        $this->service->getFyiLetters($user->fresh());
    }

    public function test_get_fyi_letter_detail_returns_letter_within_rw_scope(): void
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'rw', 'rw_id' => $rw->id]);
        $user = User::factory()->create(['role' => 'rw']);
        $user->official()->save($official);

        $result = $this->service->getFyiLetterDetail($letter, $user->fresh());

        $this->assertSame($letter->id, $result->id);
    }

    public function test_get_fyi_letter_detail_forbidden_for_letter_outside_rw(): void
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

        $this->service->getFyiLetterDetail($letter, $user->fresh());
    }

    public function test_get_fyi_letter_detail_aborts_when_user_has_no_official(): void
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);

        $user = User::factory()->create(['role' => 'rw']);

        $this->expectException(ModelNotFoundException::class);

        $this->service->getFyiLetterDetail($letter, $user);
    }
}
