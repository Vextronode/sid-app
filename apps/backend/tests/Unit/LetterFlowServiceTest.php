<?php

namespace Tests\Unit;

use App\Models\ApprovalFlow;
use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Models\User;
use App\Repositories\ApprovalFlowRepository;
use App\Repositories\LetterRepository;
use App\Repositories\LetterStatusLogRepository;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use App\Services\LetterFlowService;
use App\Services\OfficialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class LetterFlowServiceTest extends TestCase
{
    use RefreshDatabase;

    private LetterFlowService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new LetterFlowService(
            new OfficialService(new OfficialRepository, new UserRepository, new LetterRepository),
            new ApprovalFlowRepository,
            new LetterStatusLogRepository,
        );
    }

    public function test_regular_applicant_starts_at_first_step(): void
    {
        [$letter, $flow] = $this->makeLetter();
        $first = $this->addStep($flow, 1, 'rt');
        $this->addStep($flow, 2, 'kepala_desa', true);
        $rt = Rt::factory()->create();
        $letter->citizen()->associate(Citizen::factory()->create(['rt_id' => $rt->id]));
        $letter->save();
        Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id]);
        $this->addVillageOfficial($letter, 'kepala_desa');

        $result = $this->service->resolveStartStep($letter);

        $this->assertSame($first->id, $result['step']->id);
        $this->assertCount(0, $result['skipped']);
    }

    public function test_rt_applicant_skips_rt_and_starts_at_final_step(): void
    {
        [$letter, $flow, $applicant] = $this->makeLetterWithApplicant();
        $this->addStep($flow, 1, 'rt');
        $final = $this->addStep($flow, 2, 'kepala_desa', true);
        $rt = Rt::factory()->create();
        $letter->citizen()->associate(Citizen::factory()->create(['rt_id' => $rt->id]));
        $letter->save();
        Official::factory()->forUser($applicant)->position('rt')->create(['rt_id' => $rt->id]);
        $this->addVillageOfficial($letter, 'kepala_desa');

        $result = $this->service->resolveStartStep($letter);

        $this->assertSame($final->id, $result['step']->id);
        $this->assertSame(['rt'], $result['skipped']->pluck('approver_position')->all());
    }

    public function test_kades_applicant_can_resolve_final_step_through_sekdes(): void
    {
        [$letter, $flow, $applicant] = $this->makeLetterWithApplicant('kepala_desa');
        $this->addStep($flow, 1, 'rt');
        $final = $this->addStep($flow, 2, 'kepala_desa', true);
        $this->addVillageOfficial($letter, 'kepala_desa', $applicant);
        $sekdes = $this->addVillageOfficial($letter, 'sekdes');

        $result = $this->service->nextActionable($letter, 1);
        $eligible = $this->service->eligibleApprovers($final, $letter);

        $this->assertSame($final->id, $result['step']->id);
        $this->assertEqualsCanonicalizing([$sekdes->id], $eligible->modelKeys());
    }

    public function test_kades_applicant_without_sekdes_cannot_reach_final_step(): void
    {
        [$letter, $flow, $applicant] = $this->makeLetterWithApplicant('kepala_desa');
        $this->addStep($flow, 1, 'rt');
        $this->addStep($flow, 2, 'kepala_desa', true);
        $this->addVillageOfficial($letter, 'kepala_desa', $applicant);

        try {
            $this->service->nextActionable($letter, 1);
            $this->fail('Final step without an eligible approver must be rejected.');
        } catch (HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
            $this->assertSame(
                'Surat tidak dapat diproses: tidak ada pejabat berwenang pada tahap final.',
                $exception->getMessage(),
            );
        }
    }

    public function test_sekdes_applicant_can_reach_final_step_through_kades(): void
    {
        [$letter, $flow, $applicant] = $this->makeLetterWithApplicant('sekretaris_desa');
        $this->addStep($flow, 1, 'rt');
        $final = $this->addStep($flow, 2, 'kepala_desa', true);
        $this->addVillageOfficial($letter, 'sekdes', $applicant);
        $kades = $this->addVillageOfficial($letter, 'kepala_desa');

        $result = $this->service->nextActionable($letter, 1);

        $this->assertSame($final->id, $result['step']->id);
        $this->assertEqualsCanonicalizing(
            [$kades->id],
            $this->service->eligibleApprovers($final, $letter)->modelKeys(),
        );
    }

    public function test_vacant_non_final_rt_step_is_not_skipped(): void
    {
        [$letter, $flow] = $this->makeLetter();
        $rtStep = $this->addStep($flow, 1, 'rt');
        $this->addStep($flow, 2, 'kepala_desa', true);

        $result = $this->service->resolveStartStep($letter);

        $this->assertSame($rtStep->id, $result['step']->id);
        $this->assertCount(0, $result['skipped']);
    }

    public function test_official_with_matching_citizen_is_excluded_even_when_user_differs(): void
    {
        [$letter, $flow, $applicant] = $this->makeLetterWithApplicant();
        $step = $this->addStep($flow, 1, 'rt');
        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter->citizen()->associate($citizen);
        $letter->citizen_id = $citizen->id;
        $letter->save();
        $applicant->update(['citizen_id' => $citizen->id]);
        $official = Official::factory()->create([
            'citizen_id' => $citizen->id,
            'user_id' => User::factory()->create()->id,
            'position' => 'rt',
            'rt_id' => $rt->id,
        ]);

        $this->assertCount(0, $this->service->eligibleApprovers($step, $letter));
        $this->assertTrue($this->service->isApplicantOfficial($letter, $official));
    }

    public static function nonRtPositionProvider(): array
    {
        return [
            ['rw'],
            ['kadus'],
            ['petugas_desa'],
            ['kasi_pelayanan'],
            ['kaur_tu_umum'],
        ];
    }

    #[DataProvider('nonRtPositionProvider')]
    public function test_rw_kadus_petugas_kasi_and_kaur_applicants_do_not_skip_rt_step(string $position): void
    {
        [$letter, $flow, $applicant] = $this->makeLetterWithApplicant($position);
        $rtStep = $this->addStep($flow, 1, 'rt');
        $this->addStep($flow, 2, 'kepala_desa', true);
        Official::factory()->forUser($applicant)->position($position)->create();
        $this->addVillageOfficial($letter, 'kepala_desa');

        $result = $this->service->resolveStartStep($letter);

        $this->assertSame($rtStep->id, $result['step']->id);
        $this->assertCount(0, $result['skipped']);
    }

    private function makeLetter(): array
    {
        $flow = ApprovalFlow::factory()->create();
        $letter = Letter::factory()->create(['flow_id' => $flow->id]);

        return [$letter, $flow];
    }

    private function makeLetterWithApplicant(string $role = 'warga'): array
    {
        [$letter, $flow] = $this->makeLetter();
        $citizen = Citizen::factory()->create(['village_id' => $letter->village_id]);
        $applicant = User::factory()->create([
            'role' => $role,
            'citizen_id' => $citizen->id,
            'village_id' => $letter->village_id,
        ]);
        $letter->update([
            'citizen_id' => $citizen->id,
            'submitted_by' => $applicant->id,
        ]);

        return [$letter->fresh(), $flow, $applicant];
    }

    private function addStep(ApprovalFlow $flow, int $order, string $position, bool $final = false): FlowStep
    {
        return FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => $order,
            'approver_position' => $position,
            'is_final' => $final,
        ]);
    }

    private function addVillageOfficial(Letter $letter, string $position, ?User $user = null): Official
    {
        return Official::factory()->create([
            'user_id' => $user?->id,
            'citizen_id' => $user?->citizen_id ?? Citizen::factory()->create(['village_id' => $letter->village_id])->id,
            'position' => $position,
            'village_id' => $letter->village_id,
            'is_active' => true,
        ]);
    }
}
