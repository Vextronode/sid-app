<?php

namespace Tests;

use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function makeStafSidActor(?string $villageId = null): User
    {
        return User::factory()->create([
            'role' => 'staf_sid',
            'village_id' => $villageId ?? Village::query()->value('id') ?? Village::factory()->create()->id,
        ]);
    }

    protected function makeUserWithOfficialAssignment(string $role, string $position, ?string $villageId = null, array $officialData = []): User
    {
        $villageId ??= Village::query()->value('id') ?? Village::factory()->create()->id;
        $citizen = Citizen::factory()->create(['village_id' => $villageId]);
        $user = User::factory()->create([
            'role' => $role,
            'village_id' => $villageId,
            'citizen_id' => $citizen->id,
        ]);
        Official::factory()->create(array_merge([
            'user_id' => $user->id,
            'citizen_id' => $citizen->id,
            'position' => $position,
            'village_id' => $villageId,
            'is_active' => true,
        ], $officialData));

        return $user->fresh();
    }

    /**
     * Warga yang RT-nya ada di dusun ini. Dusun warga selalu diturunkan dari
     * RT -> RW (Citizen::booted), jadi hamlet_id tidak bisa diisi langsung.
     */
    protected function makeCitizenInHamlet(Hamlet $hamlet, array $attributes = []): Citizen
    {
        $rw = Rw::factory()->create(['hamlet_id' => $hamlet->id]);
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);

        return Citizen::factory()->create(['rt_id' => $rt->id, ...$attributes]);
    }
}
