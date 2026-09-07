<?php

namespace Database\Factories;

use App\Models\Letter;
use App\Models\LetterType;
use App\Models\User;
use App\Models\Village;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Letter>
 */
class LetterFactory extends Factory
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
            'letter_type_id' => LetterType::factory(),
            'submitted_by' => User::factory(),
            'on_behalf_of' => null,
            'citizen_id' => null,
            'letter_number' => null,
            'applicant_name' => fake()->name(),
            'applicant_nik' => fake()->numerify('################'),
            'applicant_address' => fake()->address(),
            'purpose' => fake()->sentence(),
            'notes' => null,
            'status' => 'pending',
            'revision_count' => 0,
            'is_overdue' => false,
            'expires_at' => null,
            'submitted_at' => now(),
            'processed_at' => null,
        ];
    }
}
