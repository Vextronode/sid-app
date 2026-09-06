<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Official;
use App\Models\User;
use App\Repositories\LetterRepository;
use App\Services\KadusApprovalService;
use App\Services\OfficialService;
use HttpException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class KadusApprovalServiceTest extends TestCase
{
    use RefreshDatabase;

    private KadusApprovalService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new KadusApprovalService(
            new OfficialService(new OfficialRepository, new UserRepository),
            new LetterRepository,
            new OfficialRepository,
        );
    }

    public function test_get_letters_throws_403_when_official_missing(): void
    {
        $user = User::factory()->create(['role' => 'kadus']);

        $this->expectException(HttpException::class);

        $this->service->getLetters($user);
    }

    public function test_get_letters_scopes_to_own_hamlet(): void
    {
        $hamlet = Hamlet::factory()->create();
        $citizen = Citizen::factory()->create(['hamlet_id' => $hamlet->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id]);
        Letter::factory()->create();

        $official = Official::factory()->create(['position' => 'kadus', 'hamlet_id' => $hamlet->id]);
        $user = User::factory()->create(['role' => 'kadus']);
        $user->official()->save($official);

        $result = $this->service->getLetters($user->fresh());

        $this->assertCount(1, $result);
        $this->assertSame($letter->id, $result->first()->id);
    }

    public function test_decision_approve_notifies_next_official_and_updates_letter(): void
    {
        Notification::fake();

        $hamlet = Hamlet::factory()->create();
        $citizen = Citizen::factory()->create(['hamlet_id' => $hamlet->id]);
        $letterType = LetterType::factory()->create(['assigned_role' => 'kasi_pelayanan']);
        $letter = Letter::factory()->create([
            'citizen_id' => $citizen->id,
            'letter_type_id' => $letterType->id,
            'status' => 'pending',
        ]);
        $letter->approvals()->create(['approval_level' => 'kadus', 'deadline_at' => now()->addDays(2)]);

        $official = Official::factory()->create(['position' => 'kadus', 'hamlet_id' => $hamlet->id]);
        $user = User::factory()->create(['role' => 'kadus']);
        $user->official()->save($official);

        $this->service->decision($letter, $user->fresh(), ['status' => 'approved']);

        $this->assertDatabaseHas('letters', ['id' => $letter->id, 'status' => 'kadus_approved']);
        $this->assertDatabaseHas('letter_approvals', [
            'letter_id' => $letter->id,
            'approval_level' => 'kadus',
            'approved_by' => $user->id,
        ]);
    }

    public function test_decision_forbidden_when_hamlet_mismatch(): void
    {
        $hamletOwner = Hamlet::factory()->create();
        $hamletOther = Hamlet::factory()->create();
        $citizen = Citizen::factory()->create(['hamlet_id' => $hamletOwner->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id, 'status' => 'pending']);

        $official = Official::factory()->create(['position' => 'kadus', 'hamlet_id' => $hamletOther->id]);
        $user = User::factory()->create(['role' => 'kadus']);
        $user->official()->save($official);

        $this->expectException(HttpException::class);

        $this->service->decision($letter, $user->fresh(), ['status' => 'approved']);
    }
}
