<?php

namespace Tests\Concerns;

use App\Models\ApprovalFlow;
use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Hamlet;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;

/**
 * Penyusun skenario surat untuk feature test: wilayah, akun warga,
 * akun pejabat, dan flow RT -> Kepala Desa.
 */
trait BuildsLetterScenario
{
    protected function makeDefaultFlow(): ApprovalFlow
    {
        return $this->makeFlowWithSteps([
            ['position' => 'rt', 'final' => false],
            ['position' => 'kepala_desa', 'final' => true],
        ]);
    }

    /**
     * @param  array<int, array{position: string, final: bool}>  $steps
     */
    protected function makeFlowWithSteps(array $steps): ApprovalFlow
    {
        $flow = ApprovalFlow::factory()->create();

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
     * @return array{rw: Rw, rt: Rt, hamlet: Hamlet}
     */
    protected function makeArea(Village $village): array
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

        return compact('rw', 'rt', 'hamlet');
    }

    /**
     * @return array{user: User, citizen: Citizen}
     */
    protected function makeCitizenAccount(Village $village, ?Rt $rt, string $role = 'warga', array $citizenAttributes = []): array
    {
        $citizen = Citizen::factory()->create([
            'village_id' => $village->id,
            'rt_id' => $rt?->id,
            ...$citizenAttributes,
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
    protected function makeOfficialUser(string $position, Village $village, array $area = []): array
    {
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $user = User::factory()->create([
            'role' => $position,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);
        $official = Official::factory()
            ->forUser($user)
            ->position($position)
            ->create([
                'village_id' => $village->id,
                'citizen_id' => $citizen->id,
                ...$area,
            ]);

        return compact('user', 'official', 'citizen');
    }
}
