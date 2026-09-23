<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\Official;
use App\Models\Rt;
use App\Models\User;
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

    public function test_create_allows_any_authenticated_user(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $this->assertTrue($this->policy->create($user));
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

    public function test_view_allowed_for_rt_in_same_region(): void
    {
        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $letter = Letter::factory()->create(['citizen_id' => $citizen->id]);

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
        $letter = Letter::factory()->create();

        $user = User::factory()->create(['role' => $role]);
        Official::factory()->create([
            'user_id' => $user->id,
            'position' => $role === 'sekretaris_desa' ? 'sekdes' : $role,
            'village_id' => $letter->village_id,
            'is_active' => true,
        ]);

        $this->assertTrue($this->policy->view($user, $letter));
    }

    #[DataProvider('villageScopedRoleProvider')]
    public function test_view_forbidden_for_village_scoped_role_in_different_village(string $role): void
    {
        $letter = Letter::factory()->create();

        $user = User::factory()->create(['role' => $role]);
        Official::factory()->create([
            'user_id' => $user->id,
            'position' => $role === 'sekretaris_desa' ? 'sekdes' : $role,
            'village_id' => $letter->village_id + 1,
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

    public function test_view_allowed_for_petugas_desa_full_visibility(): void
    {
        $letter = Letter::factory()->create();
        $user = User::factory()->create(['role' => 'petugas_desa']);

        $this->assertTrue($this->policy->view($user, $letter));
    }

    public function test_view_forbidden_for_kadus(): void
    {
        $letter = Letter::factory()->create();
        $user = User::factory()->create(['role' => 'kadus']);

        $this->assertFalse($this->policy->view($user, $letter));
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
        $owner = User::factory()->create();
        $staff = User::factory()->create(['role' => $role]);
        $letter = Letter::factory()->create(['submitted_by' => $owner->id]);

        $this->assertTrue($this->policy->delete($staff, $letter));
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
