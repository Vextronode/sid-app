<?php

namespace Database\Factories;

use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Rt>
 */
class RtFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $number = fake()->unique()->numberBetween(1, 20);

        return [
            'rw_id' => Rw::factory(),
            'village_id' => function (array $attributes) {
                $rw = Rw::with('hamlet')->find($attributes['rw_id']);

                return $rw?->hamlet?->village_id
                    ?? Hamlet::factory()->create()->village_id;
            },
            'number' => (string) $number,
            'full_label' => 'RT '.str_pad((string) $number, 3, '0', STR_PAD_LEFT),
            'is_active' => true,
        ];
    }
}
