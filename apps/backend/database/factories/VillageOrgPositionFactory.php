<?php

namespace Database\Factories;

use App\Models\Village;
use App\Models\VillageOrgPosition;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VillageOrgPosition>
 */
class VillageOrgPositionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'village_id' => Village::factory(),
            'org_type' => fake()->randomElement(['bpd', 'bumdes', 'lpm', 'karang_taruna', 'pkk']),
            'position_label' => fake()->unique()->jobTitle(),
            'is_single_occupant' => true,
            'sort_order' => 0,
            'is_active' => true,
        ];
    }

    public function multiOccupant(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_single_occupant' => false,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
