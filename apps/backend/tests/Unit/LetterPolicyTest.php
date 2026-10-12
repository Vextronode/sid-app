<?php

namespace Tests\Unit;

use App\Enums\LetterFlowLogReason;
use App\Models\ApprovalFlow;
use App\Models\Citizen;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\LetterApproval;
use App\Models\LetterStatusLog;
use App\Models\LetterType;
use App\Models\Official;
use App\Models\Rt;
use App\Models\User;
use App\Models\Village;
use App\Policies\LetterPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LetterPolicyTest extends TestCase
{
    use RefreshDatabase;

    private LetterPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();

        $this->policy = new LetterPolicy;
    }

    public function test_view_any_allows_any_authenticated_user(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $this->assertTrue($this->policy->viewAny($user));
    }

    public function test_create_allows_active_user_linked_to_citizen(): void
    {
        $citizen = Citizen::factory()->create();
        $user = User::factory()->create([
            'role' => 'warga',
            'citizen_id' => $citizen->id,
            'is_active' => true,
        ]);

        $this->assertTrue($this->policy->create($user));
    }

    public function test_create_forbidden_for_inactive_or_unlinked_user(): void
    {
        $citizen = Citizen::factory()->create();
        $inactive = User::factory()->create([
            'citizen_id' => $citizen->id,
            'is_active' => false,
        ]);
        $unlinked = User::factory()->create(['citizen_id' => null]);

        $this->assertFalse($this->policy->create($inactive));
        $this->assertFalse($this->policy->create($unlinked));
    }

    /**
     * PATCH EV5-6-S3 (bug fix): view() sebelumnya `return true` tanpa
     * syarat untuk siapa pun yang login, memungkinkan warga sembarang
     * membuka detail surat milik warga lain lewat GET /letters/{id}
     * (letter_id auto-increment, mudah ditebak). Test lama bernama
     * `test_view_allows_any_authenticated_user` DIHAPUS karena memang
     * menguji perilaku yang sekarang sengaja diubah — digantikan
     * pasangan test pemilik/bukan-pemilik di bawah, sepadan dengan pola
     * test delete() yang sudah ada sebelumnya di file ini.
     */
    public function test_view_allowed_for_owner_warga(): void
    {
        $user = User::factory()->create(['role' => 'warga']);
        $letter = Letter::factory()->create(['submitted_by' => $user->id]);

        $this->assertTrue($this->policy->view($user, $letter));
    }

    public function test_view_forbidden_for_unrelated_warga(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create(['role' => 'warga']);
        $letter = Letter::factory()->create(['submitted_by' => $owner->id]);

        $this->assertFalse($this->policy->view($stranger, $letter));
    }

    public function test_kadus_can_view_own_letter(): void
    {
        $user = User::factory()->create(['role' => 'kadus']);
        $letter = Letter::factory()->create(['submitted_by' => $user->id]);

        $this->assertTrue($this->policy->view($user, $letter));
    }

    public function test_view_allowed_for_rt_in_same_region(): void
    {
        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id]);
        $this->markRtApproved($letter);

        $rtUser = User::factory()->create(['role' => 'rt']);
        Official::factory()->create([
            'user_id' => $rtUser->id,
            'position' => 'rt',
            'rt_id' => $rt->id,
            'is_active' => true,
        ]);

        $this->assertTrue($this->policy->view($rtUser, $letter));
    }

    public function test_view_forbidden_for_rt_in_different_region(): void
    {
        $letterRt = Rt::factory()->create();
        $otherRt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $letterRt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id]);

        $rtUser = User::factory()->create(['role' => 'rt']);
        Official::factory()->create([
            'user_id' => $rtUser->id,
            'position' => 'rt',
            'rt_id' => $otherRt->id,
            'is_active' => true,
        ]);

        $this->assertFalse($this->policy->view($rtUser, $letter));
    }

    public function test_view_allowed_for_rw_in_same_region(): void
    {
        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id]);
        $this->markRtApproved($letter);

        $rwUser = User::factory()->create(['role' => 'rw']);
        Official::factory()->create([
            'user_id' => $rwUser->id,
            'position' => 'rw',
            'rw_id' => $rt->rw_id,
            'is_active' => true,
        ]);

        $this->assertTrue($this->policy->view($rwUser, $letter));
    }

    public function test_view_forbidden_for_rw_in_different_region(): void
    {
        $letterRt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $letterRt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id]);

        $otherRt = Rt::factory()->create();

        $rwUser = User::factory()->create(['role' => 'rw']);
        Official::factory()->create([
            'user_id' => $rwUser->id,
            'position' => 'rw',
            'rw_id' => $otherRt->rw_id,
            'is_active' => true,
        ]);

        $this->assertFalse($this->policy->view($rwUser, $letter));
    }

    #[DataProvider('villageScopedRoleProvider')]
    public function test_view_allowed_for_village_scoped_role_in_same_village(string $role): void
    {
        $letter = in_array($role, ['kasi_pelayanan', 'kaur_tu_umum'], true)
            ? Letter::factory()->approved()->create([
                'letter_type_id' => LetterType::factory()->create(['assigned_role' => $role])->id,
            ])
            : Letter::factory()->create();
        $this->markRtApproved($letter);

        $user = User::factory()->create(['role' => $role]);
        Official::factory()->create([
            'user_id' => $user->id,
            'position' => $role === 'sekretaris_desa' ? 'sekdes' : $role,
            'village_id' => $letter->village_id,
            'is_active' => true,
        ]);

        $this->assertTrue($this->policy->view($user, $letter));
    }

    public function test_kades_can_view_rt_applicant_letter_after_rt_step_was_skipped(): void
    {
        $village = Village::factory()->create();
        $applicant = User::factory()->create(['role' => 'rt', 'village_id' => $village->id]);
        $kades = User::factory()->create(['role' => 'kepala_desa', 'village_id' => $village->id]);
        Official::factory()->forUser($kades)->position('kepala_desa')->create();

        $flow = ApprovalFlow::factory()->create(['village_id' => $village->id]);
        FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 1,
            'approver_position' => 'rt',
            'is_final' => false,
        ]);
        FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 2,
            'approver_position' => 'kepala_desa',
            'is_final' => true,
        ]);
        $letter = Letter::factory()->create([
            'village_id' => $village->id,
            'flow_id' => $flow->id,
            'current_step_order' => 2,
            'submitted_by' => $applicant->id,
        ]);
        LetterStatusLog::query()->create([
            'letter_id' => $letter->id,
            'actor_id' => $applicant->id,
            'old_status' => 'pending',
            'new_status' => 'pending',
            'reason' => LetterFlowLogReason::RtStageSkippedForOfficialApplicant->value,
        ]);

        $this->assertFalse($letter->approvals()->where('approval_level', 'rt')->exists());
        $this->assertTrue($this->policy->view($kades, $letter));
    }

    #[DataProvider('villageScopedRoleProvider')]
    public function test_view_forbidden_for_village_scoped_role_in_different_village(string $role): void
    {
        $letter = Letter::factory()->create();
        $otherVillage = Village::factory()->create();

        $user = User::factory()->create(['role' => $role]);
        Official::factory()->create([
            'user_id' => $user->id,
            'position' => $role === 'sekretaris_desa' ? 'sekdes' : $role,
            'village_id' => $otherVillage->id,
            'is_active' => true,
        ]);

        $this->assertFalse($this->policy->view($user, $letter));
    }

    public static function villageScopedRoleProvider(): array
    {
        return [
            ['kepala_desa'],
            ['sekretaris_desa'],
            ['kasi_pelayanan'],
            ['kaur_tu_umum'],
        ];
    }

    private function markRtApproved(Letter $letter): void
    {
        $approver = User::factory()->create(['village_id' => $letter->village_id]);
        LetterApproval::query()->create([
            'letter_id' => $letter->id,
            'approved_by' => $approver->id,
            'approval_level' => 'rt',
            'action' => 'approved',
        ]);
    }

    public function test_view_allowed_for_petugas_desa_in_own_village(): void
    {
        $village = Village::factory()->create();
        $letter = Letter::factory()->create(['village_id' => $village->id]);
        $user = User::factory()->create(['role' => 'petugas_desa', 'village_id' => $village->id]);
        Official::factory()->forUser($user)->position('petugas_desa')->create();

        $this->assertTrue($this->policy->view($user, $letter));
    }

    public function test_view_forbidden_for_petugas_desa_in_another_village(): void
    {
        $letter = Letter::factory()->create(['village_id' => Village::factory()->create()->id]);
        $otherVillage = Village::factory()->create();
        $user = User::factory()->create(['role' => 'petugas_desa', 'village_id' => $otherVillage->id]);
        Official::factory()->forUser($user)->position('petugas_desa')->create();

        $this->assertFalse($this->policy->view($user, $letter));
    }

    public function test_view_forbidden_for_kadus(): void
    {
        $letter = Letter::factory()->create();
        $user = User::factory()->create(['role' => 'kadus']);

        $this->assertFalse($this->policy->view($user, $letter));
    }

    #[DataProvider('kasiKaurRoles')]
    public function test_kasi_kaur_can_view_only_approved_letters_assigned_to_them_or_unassigned(string $role): void
    {
        $village = Village::factory()->create();
        $user = User::factory()->create([
            'role' => $role,
            'village_id' => $village->id,
        ]);
        Official::factory()->create([
            'user_id' => $user->id,
            'position' => $role,
            'village_id' => $village->id,
            'is_active' => true,
        ]);

        $matching = Letter::factory()->approved()->create([
            'village_id' => $village->id,
            'letter_type_id' => LetterType::factory()->create(['assigned_role' => $role])->id,
        ]);
        $unassigned = Letter::factory()->approved()->create([
            'village_id' => $village->id,
            'letter_type_id' => LetterType::factory()->create(['assigned_role' => null])->id,
        ]);
        $otherRole = $role === 'kasi_pelayanan' ? 'kaur_tu_umum' : 'kasi_pelayanan';
        $wrongRole = Letter::factory()->approved()->create([
            'village_id' => $village->id,
            'letter_type_id' => LetterType::factory()->create(['assigned_role' => $otherRole])->id,
        ]);
        $pending = Letter::factory()->create([
            'village_id' => $village->id,
            'letter_type_id' => $matching->letter_type_id,
        ]);

        $otherVillageLetter = Letter::factory()->approved()->create([
            'village_id' => Village::factory()->create()->id,
            'letter_type_id' => $matching->letter_type_id,
        ]);

        $this->assertTrue($this->policy->view($user, $matching));
        $this->assertTrue($this->policy->view($user, $unassigned));
        $this->assertFalse($this->policy->view($user, $wrongRole));
        $this->assertFalse($this->policy->view($user, $pending));
        $this->assertFalse($this->policy->view($user, $otherVillageLetter));
    }

    public static function kasiKaurRoles(): array
    {
        return [
            ['kasi_pelayanan'],
            ['kaur_tu_umum'],
        ];
    }

    public function test_download_requires_approved_status_and_allows_owner(): void
    {
        $owner = User::factory()->create(['role' => 'warga']);
        $pending = Letter::factory()->create(['submitted_by' => $owner->id]);
        $approved = Letter::factory()->approved()->create(['submitted_by' => $owner->id]);

        $this->assertFalse($this->policy->download($owner, $pending));
        $this->assertTrue($this->policy->download($owner, $approved));
    }

    public function test_download_allows_petugas_desa_for_approved_letter(): void
    {
        $village = Village::factory()->create();
        $user = User::factory()->create(['role' => 'petugas_desa', 'village_id' => $village->id]);
        Official::factory()->forUser($user)->position('petugas_desa')->create();
        $letter = Letter::factory()->approved()->create(['village_id' => $village->id]);

        $this->assertTrue($this->policy->download($user, $letter));
    }

    public function test_download_forbidden_for_petugas_desa_in_another_village(): void
    {
        $letter = Letter::factory()->approved()->create([
            'village_id' => Village::factory()->create()->id,
        ]);
        $otherVillage = Village::factory()->create();
        $user = User::factory()->create(['role' => 'petugas_desa', 'village_id' => $otherVillage->id]);
        Official::factory()->forUser($user)->position('petugas_desa')->create();

        $this->assertFalse($this->policy->download($user, $letter));
    }

    public function test_download_allows_same_village_kades_and_sekdes(): void
    {
        $letter = Letter::factory()->approved()->create();

        foreach (['kepala_desa', 'sekretaris_desa'] as $role) {
            $user = User::factory()->create([
                'role' => $role,
                'village_id' => $letter->village_id,
            ]);
            Official::factory()->create([
                'user_id' => $user->id,
                'position' => $role === 'sekretaris_desa' ? 'sekdes' : $role,
                'village_id' => $letter->village_id,
                'is_active' => true,
            ]);

            $this->assertTrue($this->policy->download($user, $letter));
        }
    }

    public function test_download_for_kasi_and_kaur_obeys_assigned_role_and_village(): void
    {
        $village = Village::factory()->create();
        $letter = Letter::factory()->approved()->create([
            'village_id' => $village->id,
            'letter_type_id' => LetterType::factory()->create(['assigned_role' => 'kasi_pelayanan'])->id,
        ]);
        $kasi = User::factory()->create(['role' => 'kasi_pelayanan', 'village_id' => $village->id]);
        Official::factory()->create([
            'user_id' => $kasi->id,
            'position' => 'kasi_pelayanan',
            'village_id' => $village->id,
            'is_active' => true,
        ]);
        $kaur = User::factory()->create(['role' => 'kaur_tu_umum', 'village_id' => $village->id]);
        Official::factory()->create([
            'user_id' => $kaur->id,
            'position' => 'kaur_tu_umum',
            'village_id' => $village->id,
            'is_active' => true,
        ]);

        $this->assertTrue($this->policy->download($kasi, $letter));
        $this->assertFalse($this->policy->download($kaur, $letter));

        $letter->letterType->update(['assigned_role' => null]);
        $this->assertTrue($this->policy->download($kaur, $letter->fresh()));
    }

    public function test_delete_allowed_for_owner(): void
    {
        $user = User::factory()->create(['role' => 'warga']);
        $letter = Letter::factory()->create(['submitted_by' => $user->id]);

        $this->assertTrue($this->policy->delete($user, $letter));
    }

    #[DataProvider('staffRoleProvider')]
    public function test_delete_allowed_for_staff_roles(string $role): void
    {
        $village = Village::factory()->create();
        $owner = User::factory()->create();
        $staff = User::factory()->create(['role' => $role, 'village_id' => $village->id]);
        Official::factory()->forUser($staff)
            ->position($role === 'sekretaris_desa' ? 'sekdes' : $role)
            ->create();
        $letter = Letter::factory()->create([
            'submitted_by' => $owner->id,
            'village_id' => $village->id,
        ]);

        $this->assertTrue($this->policy->delete($staff, $letter));
    }

    public function test_delete_forbidden_for_petugas_desa_in_another_village(): void
    {
        $owner = User::factory()->create();
        $letter = Letter::factory()->create([
            'submitted_by' => $owner->id,
            'village_id' => Village::factory()->create()->id,
        ]);
        $otherVillage = Village::factory()->create();
        $staff = User::factory()->create(['role' => 'petugas_desa', 'village_id' => $otherVillage->id]);
        Official::factory()->forUser($staff)->position('petugas_desa')->create();

        $this->assertFalse($this->policy->delete($staff, $letter));
    }

    public static function staffRoleProvider(): array
    {
        return [
            ['kepala_desa'],
            ['sekretaris_desa'],
            ['kasi_pelayanan'],
            ['kaur_tu_umum'],
            ['petugas_desa'],
        ];
    }

    public function test_delete_forbidden_for_unrelated_warga(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create(['role' => 'warga']);
        $letter = Letter::factory()->create(['submitted_by' => $owner->id]);

        $this->assertFalse($this->policy->delete($stranger, $letter));
    }

    public function test_delete_forbidden_for_unrelated_rt(): void
    {
        $owner = User::factory()->create();
        $rtUser = User::factory()->create(['role' => 'rt']);
        $letter = Letter::factory()->create(['submitted_by' => $owner->id]);

        $this->assertFalse($this->policy->delete($rtUser, $letter));
    }
}
