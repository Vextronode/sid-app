<?php

namespace Database\Factories;

use App\Models\Hamlet;
use App\Models\Rw;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Rw>
 */
class RwFactory extends Factory
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
            'hamlet_id' => Hamlet::factory(),
            'number' => (string) $number,
            'full_label' => 'RW '.str_pad((string) $number, 3, '0', STR_PAD_LEFT),
            'is_active' => true,
        ];
    }
}
