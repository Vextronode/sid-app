<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Official;
use App\Models\Rt;
use App\Models\User;
use App\Repositories\LetterRepository;
use App\Repositories\LetterStatusLogRepository;
use App\Repositories\LetterTypeRepository;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use App\Services\LetterService;
use App\Services\OfficialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class LetterServiceTest extends TestCase
{
    use RefreshDatabase;

    private LetterService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new LetterService(
            new OfficialService(new OfficialRepository, new UserRepository),
            new LetterRepository,
            new LetterStatusLogRepository,
            new LetterTypeRepository,
        );
    }

    public function test_create_letter_persists_letter_status_log_and_first_approval(): void
    {
        Notification::fake();

        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $rtOfficialUser = User::factory()->create();
        Official::factory()->create([
            'rt_id' => $rt->id,
            'position' => 'rt',
            'is_active' => true,
            'user_id' => $rtOfficialUser->id,
        ]);
        $letterType = LetterType::factory()->create();

        $user = User::factory()->create([
            'citizen_id' => $citizen->id,
            'village_id' => $citizen->village_id,
        ]);
        $this->actingAs($user);

        $letter = $this->service->createLetter([
            'letter_type_id' => $letterType->id,
            'purpose' => 'Keperluan administrasi',
        ]);

        $this->assertDatabaseHas('letters', [
            'id' => $letter->id,
            'status' => 'pending',
            'citizen_id' => $citizen->id,
        ]);

        $this->assertDatabaseHas('letter_status_logs', [
            'letter_id' => $letter->id,
            'new_status' => 'pending',
        ]);

        $this->assertDatabaseHas('letter_approvals', [
            'letter_id' => $letter->id,
            'approval_level' => 'rt',
        ]);
    }

    public function test_get_scoped_letters_for_warga_only_returns_own_letters(): void
    {
        $user = User::factory()->create(['role' => 'warga']);
        $ownLetter = Letter::factory()->create(['submitted_by' => $user->id]);
        Letter::factory()->create();

        $result = $this->service->getScopedLetters($user);

        $this->assertCount(1, $result);
        $this->assertSame($ownLetter->id, $result->first()->id);
    }

    public function test_get_scoped_letters_for_rt_scopes_to_citizen_rt(): void
    {
        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id]);
        Letter::factory()->create();

        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id]);
        $user = User::factory()->create(['role' => 'rt']);
        $user->official()->save($official);

        $result = $this->service->getScopedLetters($user->fresh());

        $this->assertCount(1, $result);
        $this->assertSame($letter->id, $result->first()->id);
    }

    public function test_get_scoped_letters_for_petugas_desa_sees_all(): void
    {
        Letter::factory()->count(3)->create();
        $user = User::factory()->create(['role' => 'petugas_desa']);

        $result = $this->service->getScopedLetters($user);

        $this->assertCount(3, $result);
    }

    public function test_get_scoped_letters_applies_status_filter(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        Letter::factory()->create(['status' => 'pending']);
        Letter::factory()->create(['status' => 'kasi_approved']);

        $result = $this->service->getScopedLetters($user, ['status' => 'kasi_approved']);

        $this->assertCount(1, $result);
        $this->assertSame('kasi_approved', $result->first()->status->value);
    }

    public function test_delete_allowed_for_owner(): void
    {
        $user = User::factory()->create();
        $letter = Letter::factory()->create(['submitted_by' => $user->id]);

        $result = $this->service->delete($letter, $user);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('letters', ['id' => $letter->id]);
    }

    public function test_delete_allowed_for_authorized_staff_role(): void
    {
        $owner = User::factory()->create();
        $staff = User::factory()->create(['role' => 'petugas_desa']);
        $letter = Letter::factory()->create(['submitted_by' => $owner->id]);

        $result = $this->service->delete($letter, $staff);

        $this->assertTrue($result);
    }

    public function test_delete_forbidden_for_unrelated_user(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create(['role' => 'warga']);
        $letter = Letter::factory()->create(['submitted_by' => $owner->id]);

        $this->expectException(HttpException::class);

        $this->service->delete($letter, $stranger);
    }

    public function test_get_for_show_eager_loads_letter_type_and_approvals(): void
    {
        $letter = Letter::factory()->create();

        $result = $this->service->getForShow($letter->id);

        $this->assertTrue($result->relationLoaded('letterType'));
        $this->assertTrue($result->relationLoaded('approvals'));
    }
}
