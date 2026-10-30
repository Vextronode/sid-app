<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Official;
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
            ->assertJsonPath('data.citizen.rt.id', $rt->id)
            ->assertJsonPath('data.must_change_password', false)
            ->assertJsonMissingPath('data.password');
    }

    public function test_show_returns_the_area_of_the_official_position(): void
    {
        $rt = Rt::factory()->create(['full_label' => 'RT 001 / RW 002']);
        $user = User::factory()->create(['role' => 'rt']);
        Official::factory()->forUser($user)->position('rt')->create([
            'rt_id' => $rt->id,
            'rw_id' => $rt->rw_id,
        ]);

        // Label wilayah di dashboard RT/RW/Kadus dibentuk dari official.rt/rw/hamlet.
        $this->actingAs($user)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.official.rt.full_label', 'RT 001 / RW 002')
            ->assertJsonPath('data.official.rw.id', $rt->rw_id);
    }

    public function test_show_returns_role_label_following_configured_app_name(): void
    {
        $staf = User::factory()->create(['role' => 'staf_sid']);

        $this->actingAs($staf)
            ->getJson('/api/user')
            ->assertJsonPath('data.role', 'staf_sid')
            ->assertJsonPath('data.role_label', 'Staf SIDUTama');

        config(['sid.app_name' => 'SIPANDESA']);

        $this->actingAs($staf)
            ->getJson('/api/user')
            ->assertJsonPath('data.role_label', 'Staf SIPANDESA');
    }
}
