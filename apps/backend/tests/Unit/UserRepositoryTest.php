<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private UserRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new UserRepository;
    }

    public function test_find_by_citizen_id_returns_matching_user(): void
    {
        $citizen = Citizen::factory()->create();
        $user = User::factory()->create(['citizen_id' => $citizen->id]);

        $found = $this->repository->findByCitizenId($citizen->id);

        $this->assertSame($user->id, $found->id);
    }

    public function test_all_with_citizen_and_official_eager_loads_relations(): void
    {
        User::factory()->create();

        $result = $this->repository->allWithCitizenAndOfficial();

        $this->assertCount(1, $result);
        $this->assertTrue($result->first()->relationLoaded('citizen'));
        $this->assertTrue($result->first()->relationLoaded('official'));
    }

    public function test_toggle_active_flips_is_active_flag(): void
    {
        $user = User::factory()->create(['is_active' => true]);

        $updated = $this->repository->toggleActive($user);

        $this->assertFalse($updated->is_active);

        $updated = $this->repository->toggleActive($updated);

        $this->assertTrue($updated->is_active);
    }
}
