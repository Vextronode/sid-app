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
        // 100-999: tidak bentrok dengan nomor kecil yang ditulis eksplisit di
        // test (nomor unik per desa untuk RW, per RW untuk RT).
        $number = fake()->unique()->numberBetween(100, 999);

        return [
            'rw_id' => Rw::factory(),
            'village_id' => function (array $attributes) {
                $rw = Rw::with('hamlet')->find($attributes['rw_id']);

                return $rw?->hamlet?->village_id
                    ?? Hamlet::factory()->create()->village_id;
            },
            'number' => (string) $number,
            'is_active' => true,
        ];
    }
}
