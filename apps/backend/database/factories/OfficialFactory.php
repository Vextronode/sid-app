<?php

namespace Database\Factories;

use App\Models\Citizen;
use App\Models\Official;
use App\Models\User;
use App\Models\Village;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Official>
 */
class OfficialFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'citizen_id' => Citizen::factory(),
            'user_id' => null,
            'position' => 'petugas_desa',
            'village_id' => fn () => Village::query()->value('id') ?? Village::factory()->create()->id,
            'rt_id' => null,
            'rw_id' => null,
            'hamlet_id' => null,
            'started_at' => fake()->date(),
            'term_ends_at' => null,
            'is_active' => true,
        ];
    }

    public function forUser(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $user->id,
            'citizen_id' => $user->citizen_id ?? Citizen::factory()->state(['village_id' => $user->village_id]),
            'village_id' => $user->village_id,
        ]);
    }

    public function position(string $position): static
    {
        return $this->state(fn (array $attributes) => [
            'position' => $position,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
            'ended_at' => today(),
        ]);
    }

    public function expiredTerm(): static
    {
        return $this->state(fn (array $attributes) => [
            'term_ends_at' => today()->subDay(),
        ]);
    }
}
