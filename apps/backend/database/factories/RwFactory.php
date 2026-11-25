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
        // 100-999: tidak bentrok dengan nomor kecil yang ditulis eksplisit di
        // test (nomor unik per desa untuk RW, per RW untuk RT).
        $number = fake()->unique()->numberBetween(100, 999);

        return [
            'hamlet_id' => Hamlet::factory(),
            'village_id' => function (array $attributes) {
                return Hamlet::find($attributes['hamlet_id'])?->village_id
                    ?? Hamlet::factory()->create()->village_id;
            },
            'number' => (string) $number,
            'is_active' => true,
        ];
    }
}
