<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use App\Policies\OfficialPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class OfficialPolicyTest extends TestCase
{
    use RefreshDatabase;

    private OfficialPolicy $policy;

    private Official $official;

    protected function setUp(): void
    {
        parent::setUp();

        $this->policy = new OfficialPolicy;

        // Wilayah dibuat manual dengan nilai eksplisit dan dipakai
        // ulang untuk citizen/official di semua data-provider case.
        // CitizenFactory secara default menembus beberapa wilayah
        // terkait, sementara locale id_ID hanya
        // memiliki satu nilai unik untuk citySuffix(); memakai wilayah
        // eksplisit menghindari OverflowException dari unique
        // generator faker yang cepat habis pada CI/test run ini.
        $village = Village::create(['name' => 'Desa Uji Policy', 'code' => 'DUP']);
        $hamlet = Hamlet::create(['name' => 'Dusun Uji Policy', 'code' => 'DSN-UP', 'village_id' => $village->id, 'is_active' => true]);
        $rw = Rw::create(['hamlet_id' => $hamlet->id, 'number' => '001', 'full_label' => 'RW 001', 'is_active' => true]);
        $rt = Rt::create(['rw_id' => $rw->id, 'number' => '001', 'full_label' => 'RT 001 / RW 001', 'is_active' => true]);

        $citizen = Citizen::factory()->create([
            'village_id' => $village->id,
            'hamlet_id' => $hamlet->id,
            'rt_id' => $rt->id,
        ]);

        $this->official = Official::factory()->create([
            'citizen_id' => $citizen->id,
            'village_id' => $village->id,
            'hamlet_id' => $hamlet->id,
        ]);
    }

    #[DataProvider('managerRoleProvider')]
    public function test_manager_roles_are_allowed_for_all_actions(string $role): void
    {
        $user = User::factory()->create(['role' => $role]);

        $this->assertTrue($this->policy->viewAny($user));
        $this->assertTrue($this->policy->view($user, $this->official));
        $this->assertTrue($this->policy->create($user));
        $this->assertTrue($this->policy->update($user, $this->official));
        $this->assertTrue($this->policy->delete($user, $this->official));
    }

    public static function managerRoleProvider(): array
    {
        return [
            ['kepala_desa'],
            ['sekretaris_desa'],
            ['petugas_desa'],
        ];
    }

    #[DataProvider('nonManagerRoleProvider')]
    public function test_non_manager_roles_are_forbidden_for_all_actions(string $role): void
    {
        $user = User::factory()->create(['role' => $role]);

        $this->assertFalse($this->policy->viewAny($user));
        $this->assertFalse($this->policy->view($user, $this->official));
        $this->assertFalse($this->policy->create($user));
        $this->assertFalse($this->policy->update($user, $this->official));
        $this->assertFalse($this->policy->delete($user, $this->official));
    }

    public static function nonManagerRoleProvider(): array
    {
        return [
            ['warga'],
            ['rt'],
            ['rw'],
            ['kadus'],
            ['kaur_tu_umum'],
        ];
    }
}
