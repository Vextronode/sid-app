<?php

namespace Database\Factories;

use App\Models\VillageOrgMember;
use App\Models\VillageOrgPosition;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VillageOrgMember>
 */
class VillageOrgMemberFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'position_id' => VillageOrgPosition::factory(),
            'member_name' => fake()->name(),
            'photo_img' => null,
            'phone_wa' => fake()->numerify('08##########'),
            'started_at' => fake()->date(),
            'ended_at' => null,
            'is_active' => true,
            'notes' => null,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
            'ended_at' => fake()->date(),
        ]);
    }
}
