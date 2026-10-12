<?php

namespace Tests\Unit;

use App\Models\ApprovalFlow;
use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Models\User;
use App\Models\Village;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use App\Services\Auth\UsernameGenerator;
use App\Services\OfficialAssignmentService;
use App\Services\OfficialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class OfficialAssignmentServiceTest extends TestCase
{
    use RefreshDatabase;

    private function service(): OfficialAssignmentService
    {
        $officialRepository = new OfficialRepository;
        $userRepository = new UserRepository;

        return new OfficialAssignmentService(
            $officialRepository,
            $userRepository,
            new LetterRepository,
            new OfficialService($officialRepository, $userRepository, new LetterRepository),
            new UsernameGenerator($userRepository),
        );
    }

    public function test_promote_assigns_role_and_writes_activity(): void
    {
        [$actor, $target, $village] = $this->actorAndCitizenUser();
        $rt = Rt::factory()->create(['village_id' => $village->id]);

        $official = $this->service()->promote($actor, [
            'user_id' => $target->id,
            'position' => 'rt',
            'rt_id' => $rt->id,
            'started_at' => today()->toDateString(),
        ]);

        $this->assertSame($target->id, $official->user_id);
        $this->assertSame('rt', $target->fresh()->role);
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'official',
            'description' => 'promoted',
            'subject_id' => (string) $official->id,
            'causer_id' => (string) $actor->id,
        ]);
    }

    public function test_promote_rejects_non_petugas_actor_and_ineligible_target(): void
    {
        [$actor, $target, $village] = $this->actorAndCitizenUser('rt');

        try {
            $this->service()->promote($actor, [
                'user_id' => $target->id,
                'position' => 'sekdes',
                'started_at' => today()->toDateString(),
            ]);
            $this->fail('Non-Petugas Desa actor must be rejected.');
        } catch (HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
        }

        $actor->update(['role' => 'petugas_desa']);
        $target->update(['role' => 'rt']);

        try {
            $this->service()->promote($actor, [
                'user_id' => $target->id,
                'position' => 'sekdes',
                'started_at' => today()->toDateString(),
            ]);
            $this->fail('Non-warga target must be rejected.');
        } catch (HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
        }
    }

    public function test_promote_rejects_target_with_active_official_and_duplicate_position(): void
    {
        [$actor, $target, $village] = $this->actorAndCitizenUser();
        Official::factory()->forUser($target)->create();

        $this->expectException(HttpException::class);
        $this->service()->promote($actor, [
            'user_id' => $target->id,
            'position' => 'sekdes',
            'started_at' => today()->toDateString(),
        ]);
    }

    public function test_promote_rejects_duplicate_scoped_position(): void
    {
        [$actor, $target, $village] = $this->actorAndCitizenUser();
        $rt = Rt::factory()->create(['village_id' => $village->id]);
        Official::factory()->create([
            'position' => 'rt',
            'village_id' => $village->id,
            'rt_id' => $rt->id,
            'is_active' => true,
        ]);

        $this->expectException(HttpException::class);
        $this->service()->promote($actor, [
            'user_id' => $target->id,
            'position' => 'rt',
            'rt_id' => $rt->id,
            'started_at' => today()->toDateString(),
        ]);
    }

    public function test_demote_rt_returns_warning_for_waiting_letters_and_updates_role(): void
    {
        [$actor, $target, $village] = $this->actorAndCitizenUser();
        $rt = Rt::factory()->create(['village_id' => $village->id]);
        $target->update(['role' => 'rt']);
        $official = Official::factory()->forUser($target)->position('rt')->create([
            'village_id' => $village->id,
            'rt_id' => $rt->id,
        ]);
        $citizen = $target->citizen;
        $citizen->update(['village_id' => $village->id, 'rt_id' => $rt->id]);
        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 1,
            'approver_position' => 'rt',
        ]);
        Letter::factory()->create([
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
            'flow_id' => $flow->id,
            'current_step_order' => 1,
        ]);

        $result = $this->service()->demote($actor, $official, 'Akhir masa tugas');

        $this->assertFalse($result['official']->is_active);
        $this->assertSame('warga', $target->fresh()->role);
        $this->assertSame(1, $result['warnings'][0]['count']);
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'official',
            'description' => 'demoted',
            'subject_id' => (string) $official->id,
        ]);
    }

    public function test_demote_kades_warns_if_no_kades_or_sekdes_remain_for_waiting_letters(): void
    {
        [$actor, $target, $village] = $this->actorAndCitizenUser();
        $target->update(['role' => 'kepala_desa']);
        $official = Official::factory()->forUser($target)->position('kepala_desa')->create([
            'village_id' => $village->id,
        ]);
        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 1,
            'approver_position' => 'kepala_desa',
        ]);
        Letter::factory()->create([
            'village_id' => $village->id,
            'flow_id' => $flow->id,
            'current_step_order' => 1,
        ]);

        $result = $this->service()->demote($actor, $official);

        $this->assertSame(1, $result['warnings'][0]['count']);
        $this->assertSame('letters_without_approver', $result['warnings'][0]['code']);
    }

    public function test_petugas_cannot_demote_self_and_last_petugas_cannot_be_demoted_by_another(): void
    {
        $village = Village::factory()->create();
        $self = User::factory()->create(['role' => 'petugas_desa', 'village_id' => $village->id]);
        $selfOfficial = Official::factory()->forUser($self)->position('petugas_desa')->create();

        try {
            $this->service()->demote($self, $selfOfficial);
            $this->fail('Self-demotion of the only Petugas Desa must be rejected.');
        } catch (HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
            $this->assertSame(
                'Aksi gagal karena Anda adalah petugas tersisa. Petugas desa tidak boleh kosong.',
                $exception->getMessage(),
            );
        }

    }

    public function test_petugas_self_demote_is_rejected_when_another_petugas_remains(): void
    {
        $actor = User::factory()->create(['role' => 'petugas_desa']);
        $official = Official::factory()->forUser($actor)->position('petugas_desa')->create();
        User::factory()->create(['role' => 'petugas_desa']);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Anda tidak dapat menurunkan diri sendiri. Minta petugas lain untuk menurunkan Anda.');
        $this->service()->demote($actor, $official);
    }

    public function test_rotate_demotes_old_and_promotes_new_user_atomically_with_rotated_audit(): void
    {
        [$actor, $newUser, $village] = $this->actorAndCitizenUser();
        $oldUser = User::factory()->create(['role' => 'rt', 'village_id' => $village->id]);
        $rt = Rt::factory()->create(['village_id' => $village->id]);
        $oldOfficial = Official::factory()->forUser($oldUser)->position('rt')->create([
            'village_id' => $village->id,
            'rt_id' => $rt->id,
        ]);

        $result = $this->service()->rotate($actor, $oldOfficial, [
            'user_id' => $newUser->id,
            'started_at' => today()->toDateString(),
            'rt_id' => $rt->id,
        ]);

        $this->assertSame([], $result['warnings']);

        $this->assertFalse($result['old_official']->is_active);
        $this->assertSame($newUser->id, $result['new_official']->user_id);
        $this->assertSame('rt', $newUser->fresh()->role);
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'official',
            'description' => 'rotated',
            'subject_id' => (string) $oldOfficial->id,
        ]);
    }

    public function test_rotate_rejects_petugas_position(): void
    {
        $actor = User::factory()->create(['role' => 'petugas_desa']);
        $old = Official::factory()->create(['position' => 'petugas_desa']);

        try {
            $this->service()->rotate($actor, $old, []);
            $this->fail('Petugas Desa must not be rotated.');
        } catch (HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
        }
    }

    private function actorAndCitizenUser(string $actorRole = 'petugas_desa'): array
    {
        $village = Village::factory()->create();
        $actor = User::factory()->create([
            'role' => $actorRole,
            'village_id' => $village->id,
        ]);
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $target = User::factory()->create([
            'role' => 'warga',
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        return [$actor, $target, $village];
    }
}
