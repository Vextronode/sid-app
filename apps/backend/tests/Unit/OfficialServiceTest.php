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
use App\Services\OfficialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class OfficialServiceTest extends TestCase
{
    use RefreshDatabase;

    private OfficialService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new OfficialService(
            new OfficialRepository,
            new UserRepository,
            new LetterRepository,
        );
    }

    public function test_resolve_rt_for_citizen_returns_active_rt_official(): void
    {
        $rt = Rt::factory()->create();
        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);

        $result = $this->service->resolveRtForCitizen($citizen);

        $this->assertSame($official->id, $result->id);
    }

    public function test_resolve_next_officials_returns_empty_when_letter_has_no_flow_step(): void
    {
        $flow = ApprovalFlow::factory()->create();
        $letter = Letter::factory()->create(['flow_id' => $flow->id, 'current_step_order' => 999]);

        $result = $this->service->resolveNextOfficials($letter);

        $this->assertCount(0, $result);
    }

    public function test_resolve_next_officials_for_region_based_step_returns_rt_officials(): void
    {
        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $rtOfficial = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'rt']);

        $letter = Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'citizen_id' => $citizen->id,
        ]);

        $result = $this->service->resolveNextOfficials($letter);

        $this->assertCount(1, $result);
        $this->assertSame($rtOfficial->id, $result->first()->id);
    }

    public function test_resolve_next_officials_for_region_based_step_returns_empty_when_citizen_has_no_rt(): void
    {
        $citizen = Citizen::factory()->create(['rt_id' => null]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'rt']);

        $letter = Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'citizen_id' => $citizen->id,
        ]);

        $result = $this->service->resolveNextOfficials($letter);

        $this->assertCount(0, $result);
    }

    public function test_resolve_next_officials_for_region_based_step_returns_empty_when_letter_has_no_citizen(): void
    {
        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'rt']);

        $letter = Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'citizen_id' => null,
        ]);

        $result = $this->service->resolveNextOfficials($letter);

        $this->assertCount(0, $result);
    }

    public function test_resolve_next_officials_for_position_based_step_returns_officials_in_same_village(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $kasi = Official::factory()->create([
            'position' => 'kasi_pelayanan',
            'village_id' => $village->id,
            'is_active' => true,
        ]);

        // Official dengan posisi sama tapi village berbeda TIDAK boleh ikut.
        Official::factory()->create([
            'position' => 'kasi_pelayanan',
            'village_id' => Village::factory()->create()->id,
            'is_active' => true,
        ]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'kasi_pelayanan']);

        $letter = Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $result = $this->service->resolveNextOfficials($letter);

        $this->assertCount(1, $result);
        $this->assertSame($kasi->id, $result->first()->id);
    }

    #[DataProvider('positionBasedApproverPositions')]
    public function test_resolve_next_officials_for_each_position_based_approver(string $approverPosition): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $official = Official::factory()->create([
            'position' => $approverPosition,
            'village_id' => $village->id,
            'is_active' => true,
        ]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => $approverPosition]);

        $letter = Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $result = $this->service->resolveNextOfficials($letter);

        $this->assertCount(1, $result);
        $this->assertSame($official->id, $result->first()->id);
    }

    public static function positionBasedApproverPositions(): array
    {
        return [
            ['kepala_desa'],
            ['sekdes'],
            ['kasi_pelayanan'],
            ['kaur_tu_umum'],
        ];
    }

    public function test_resolve_next_officials_excludes_inactive_officials(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        Official::factory()->create([
            'position' => 'kasi_pelayanan',
            'village_id' => $village->id,
            'is_active' => false,
        ]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'kasi_pelayanan']);

        $letter = Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $result = $this->service->resolveNextOfficials($letter);

        $this->assertCount(0, $result);
    }

    public function test_resolve_officials_for_step_can_be_called_directly_with_a_flow_step(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $official = Official::factory()->create([
            'position' => 'kaur_tu_umum',
            'village_id' => $village->id,
            'is_active' => true,
        ]);

        $flow = ApprovalFlow::factory()->create();
        $step = FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'kaur_tu_umum']);

        $letter = Letter::factory()->create([
            'flow_id' => $flow->id,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $result = $this->service->resolveOfficialsForStep($step, $letter);

        $this->assertCount(1, $result);
        $this->assertSame($official->id, $result->first()->id);
    }

    /**
     * EV5-4-S5: jawaban pertanyaan Sekdes sudah dikonfirmasi — Kepala
     * Desa dan Sekdes saling menggantikan. Step 'kepala_desa' harus
     * meresolve KEDUA posisi sekaligus.
     */
    public function test_resolve_next_officials_for_kepala_desa_step_includes_sekdes(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        $kades = Official::factory()->create([
            'position' => 'kepala_desa',
            'village_id' => $village->id,
            'is_active' => true,
        ]);
        $sekdes = Official::factory()->create([
            'position' => 'sekdes',
            'village_id' => $village->id,
            'is_active' => true,
        ]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'kepala_desa']);

        $letter = Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $result = $this->service->resolveNextOfficials($letter);

        $this->assertCount(2, $result);
        $this->assertEqualsCanonicalizing(
            [$kades->id, $sekdes->id],
            $result->pluck('id')->all(),
        );
    }

    /**
     * Sekdes tetap dibatasi village yang sama seperti Kades — bukan
     * seluruh sekdes se-sistem.
     */
    public function test_resolve_next_officials_for_kepala_desa_step_excludes_sekdes_in_other_village(): void
    {
        $village = Village::factory()->create();
        $otherVillage = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);

        $kades = Official::factory()->create([
            'position' => 'kepala_desa',
            'village_id' => $village->id,
            'is_active' => true,
        ]);
        Official::factory()->create([
            'position' => 'sekdes',
            'village_id' => $otherVillage->id,
            'is_active' => true,
        ]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'kepala_desa']);

        $letter = Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $result = $this->service->resolveNextOfficials($letter);

        $this->assertCount(1, $result);
        $this->assertSame($kades->id, $result->first()->id);
    }

    /**
     * Posisi lain (bukan kepala_desa) tidak ikut terpengaruh perluasan
     * ini — sekdes TIDAK muncul untuk step selain kepala_desa.
     */
    public function test_resolve_next_officials_for_non_kepala_desa_step_excludes_sekdes(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create(['village_id' => $village->id]);
        Official::factory()->create([
            'position' => 'sekdes',
            'village_id' => $village->id,
            'is_active' => true,
        ]);
        $kasi = Official::factory()->create([
            'position' => 'kasi_pelayanan',
            'village_id' => $village->id,
            'is_active' => true,
        ]);

        $flow = ApprovalFlow::factory()->create();
        FlowStep::factory()->create(['flow_id' => $flow->id, 'step_order' => 1, 'approver_position' => 'kasi_pelayanan']);

        $letter = Letter::factory()->create([
            'flow_id' => $flow->id,
            'current_step_order' => 1,
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
        ]);

        $result = $this->service->resolveNextOfficials($letter);

        $this->assertCount(1, $result);
        $this->assertSame($kasi->id, $result->first()->id);
    }

    public function test_resolve_citizen_user_returns_user_by_citizen_id(): void
    {
        $citizen = Citizen::factory()->create();
        $user = User::factory()->create(['citizen_id' => $citizen->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id]);

        $result = $this->service->resolveCitizenUser($letter);

        $this->assertSame($user->id, $result->id);
    }

    public function test_resolve_citizen_user_returns_null_when_no_user_linked(): void
    {
        $citizen = Citizen::factory()->create();
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id]);

        $result = $this->service->resolveCitizenUser($letter);

        $this->assertNull($result);
    }

    public function test_resolve_village_head_returns_active_kepala_desa(): void
    {
        $official = Official::factory()->create(['position' => 'kepala_desa', 'is_active' => true]);

        $result = $this->service->resolveVillageHead();

        $this->assertSame($official->id, $result->id);
    }

    public function test_get_all_with_relations_returns_all_officials(): void
    {
        Official::factory()->count(3)->create();

        $result = $this->service->getAllWithRelations();

        $this->assertCount(3, $result);
    }

    public function test_get_for_show_returns_official_with_relations(): void
    {
        $official = Official::factory()->create();

        $result = $this->service->getForShow($official->id);

        $this->assertSame($official->id, $result->id);
        $this->assertTrue($result->relationLoaded('citizen'));
    }

    public function test_create_persists_new_official(): void
    {
        $citizen = Citizen::factory()->create();

        $official = $this->service->create([
            'citizen_id' => $citizen->id,
            'position' => 'petugas_desa',
            'started_at' => now()->toDateString(),
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('officials', ['id' => $official->id, 'position' => 'petugas_desa']);
    }

    public function test_create_rejects_duplicate_active_position_in_same_scope(): void
    {
        $rt = Rt::factory()->create();
        Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);

        $citizen = Citizen::factory()->create();

        $this->expectException(HttpException::class);

        $this->service->create([
            'citizen_id' => $citizen->id,
            'position' => 'rt',
            'rt_id' => $rt->id,
            'started_at' => now()->toDateString(),
            'is_active' => true,
        ]);
    }

    public function test_create_allows_inactive_duplicate_position(): void
    {
        $rt = Rt::factory()->create();
        Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);

        $citizen = Citizen::factory()->create();

        $official = $this->service->create([
            'citizen_id' => $citizen->id,
            'position' => 'rt',
            'rt_id' => $rt->id,
            'started_at' => now()->toDateString(),
            'is_active' => false,
        ]);

        $this->assertDatabaseHas('officials', ['id' => $official->id, 'is_active' => false]);
    }

    public function test_update_persists_changes_without_conflict(): void
    {
        $official = Official::factory()->create(['position' => 'petugas_desa', 'phone_wa' => '0800']);

        $updated = $this->service->update($official, ['phone_wa' => '0899']);

        $this->assertSame('0899', $updated->phone_wa);
    }

    public function test_update_rejects_when_creating_duplicate_active_position(): void
    {
        $rt = Rt::factory()->create();
        Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);
        $other = Official::factory()->create(['position' => 'kadus', 'is_active' => true]);

        $this->expectException(HttpException::class);

        $this->service->update($other, [
            'position' => 'rt',
            'rt_id' => $rt->id,
            'is_active' => true,
        ]);
    }

    public function test_update_allows_updating_the_same_record_without_conflict(): void
    {
        $rt = Rt::factory()->create();
        $official = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);

        $updated = $this->service->update($official, ['phone_wa' => '0812']);

        $this->assertSame('0812', $updated->phone_wa);
    }

    public function test_delete_removes_official(): void
    {
        $official = Official::factory()->create();

        $this->service->delete($official);

        $this->assertDatabaseMissing('officials', ['id' => $official->id]);
    }

    /**
     * EV5-11-S3. rotate() sesuai paths/officials/rotate.yaml.
     */
    public function test_rotate_ends_old_official_and_creates_active_new_one_in_same_scope(): void
    {
        $rt = Rt::factory()->create();
        $old = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);
        $newCitizen = Citizen::factory()->create();
        $newUser = User::factory()->create();

        $result = $this->service->rotate($old, [
            'citizen_id' => $newCitizen->id,
            'user_id' => $newUser->id,
            'started_at' => now()->toDateString(),
        ]);

        $this->assertFalse($result['old_official']->is_active);
        $this->assertNotNull($result['old_official']->ended_at);
        $this->assertTrue($result['new_official']->is_active);
        $this->assertSame('rt', $result['new_official']->position);
        $this->assertSame($rt->id, $result['new_official']->rt_id);
        $this->assertSame($newCitizen->id, $result['new_official']->citizen_id);
    }

    public function test_rotate_to_sekdes_position_syncs_user_role_to_sekretaris_desa(): void
    {
        $old = Official::factory()->create(['position' => 'sekdes', 'is_active' => true]);
        $newCitizen = Citizen::factory()->create();
        $newUser = User::factory()->create(['role' => 'rt']);

        $this->service->rotate($old, [
            'citizen_id' => $newCitizen->id,
            'user_id' => $newUser->id,
            'started_at' => now()->toDateString(),
        ]);

        $this->assertSame('sekretaris_desa', $newUser->fresh()->role);
    }

    public function test_rotate_to_non_sekdes_position_does_not_touch_user_role(): void
    {
        $rt = Rt::factory()->create();
        $old = Official::factory()->create(['position' => 'rt', 'rt_id' => $rt->id, 'is_active' => true]);
        $newCitizen = Citizen::factory()->create();
        $newUser = User::factory()->create(['role' => 'warga']);

        $this->service->rotate($old, [
            'citizen_id' => $newCitizen->id,
            'user_id' => $newUser->id,
            'started_at' => now()->toDateString(),
        ]);

        $this->assertSame('warga', $newUser->fresh()->role);
    }
}
