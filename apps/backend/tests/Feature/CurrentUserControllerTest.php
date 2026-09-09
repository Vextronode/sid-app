<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Rt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CurrentUserControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_show_returns_authenticated_user_with_full_profile(): void
    {
        $rt = Rt::factory()->create();
        $citizen = Citizen::factory()->create(['rt_id' => $rt->id]);
        $user = User::factory()->create(['citizen_id' => $citizen->id]);

        $this->actingAs($user)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.citizen.id', $citizen->id)
            ->assertJsonPath('data.citizen.rt.id', $rt->id);
    }
}
