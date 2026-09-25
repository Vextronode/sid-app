<?php

namespace Tests\Unit;

use App\Models\User;
use App\Policies\RegionPolicy;
use Tests\TestCase;

class RegionPolicyTest extends TestCase
{
    public function test_non_petugas_cannot_manage_regions(): void
    {
        $user = User::factory()->make([
            'role' => 'rt',
            'village_id' => 1,
        ]);

        self::assertFalse((new RegionPolicy)->create($user));
    }

    public function test_petugas_without_village_cannot_manage_regions(): void
    {
        $user = User::factory()->make([
            'role' => 'petugas_desa',
            'village_id' => null,
        ]);

        self::assertFalse((new RegionPolicy)->create($user));
    }
}
