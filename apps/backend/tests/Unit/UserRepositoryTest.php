<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Official;
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

    public function test_find_by_username_matches_lowercase_and_trimmed_value(): void
    {
        $user = User::factory()->create(['username' => '  AdminUser  ']);

        $result = $this->repository->findByUsername('adminuser');

        $this->assertNotNull($result);
        $this->assertSame($user->id, $result->id);
    }

    public function test_username_exists_ignores_same_user_and_works_case_insensitive(): void
    {
        $user = User::factory()->create(['username' => 'bambang']);

        $this->assertTrue($this->repository->usernameExists('BAMBANG'));
        $this->assertFalse($this->repository->usernameExists('BAMBANG', $user->id));
        $this->assertFalse($this->repository->usernameExists('other_user'));
    }

    public function test_find_with_full_profile_eager_loads_active_official(): void
    {
        $user = User::factory()->create();
        Official::factory()->forUser($user)->create();

        $result = $this->repository->findWithFullProfile($user);

        $this->assertTrue($result->relationLoaded('official'));
    }
}
