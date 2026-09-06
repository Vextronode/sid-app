<?php

namespace Database\Factories;

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
            'number' => (string) $number,
            'full_label' => 'RT '.str_pad((string) $number, 3, '0', STR_PAD_LEFT),
            'is_active' => true,
        ];
    }
}
