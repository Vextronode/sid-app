<?php

namespace Tests\Unit;

use App\Models\User;
use App\Repositories\UserRepository;
use App\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserServiceTest extends TestCase
{
    use RefreshDatabase;

    private UserService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new UserService(new UserRepository);
    }

    public function test_get_all_with_citizen_and_official_returns_users(): void
    {
        User::factory()->count(2)->create();

        $result = $this->service->getAllWithCitizenAndOfficial();

        $this->assertCount(2, $result);
    }

    public function test_toggle_active_flips_status(): void
    {
        $user = User::factory()->create(['is_active' => true]);

        $result = $this->service->toggleActive($user);

        $this->assertFalse($result->is_active);
    }
}
