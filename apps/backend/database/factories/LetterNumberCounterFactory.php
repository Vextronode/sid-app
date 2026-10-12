<?php

namespace Database\Factories;

use App\Models\LetterNumberCounter;
use App\Models\LetterType;
use App\Models\Village;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LetterNumberCounter>
 */
class LetterNumberCounterFactory extends Factory
{
    protected $model = LetterNumberCounter::class;

    public function definition(): array
    {
        return [
            'village_id' => Village::factory(),
            'letter_type_id' => LetterType::factory(),
            'year' => (int) now()->format('Y'),
            'last_number' => 0,
        ];
    }
}
