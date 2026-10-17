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
            'slot' => 'ketua',
            'position_label' => 'Ketua',
            'is_single_occupant' => true,
            'sort_order' => 0,
            'is_active' => true,
        ];
    }

    public function wakilKetua(): static
    {
        return $this->state(fn (array $attributes) => [
            'slot' => 'wakil_ketua',
            'position_label' => 'Wakil Ketua',
            'sort_order' => 1,
        ]);
    }

    /** Slot Anggota: bisa lebih dari satu pemegang. */
    public function multiOccupant(): static
    {
        return $this->state(fn (array $attributes) => [
            'slot' => 'anggota',
            'position_label' => 'Anggota',
            'is_single_occupant' => false,
            'sort_order' => 2,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
