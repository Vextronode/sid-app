  <?php

namespace Tests;

use App\Models\Citizen;
use App\Models\Official;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function makePetugasDesaActor(?string $villageId = null): User
    {
        return User::factory()->create([
            'role' => 'petugas_desa',
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
}
