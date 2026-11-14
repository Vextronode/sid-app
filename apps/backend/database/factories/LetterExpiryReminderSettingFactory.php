<?php

namespace Database\Factories;

use App\Models\LetterExpiryReminderSetting;
use App\Models\Village;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LetterExpiryReminderSetting>
 */
class LetterExpiryReminderSettingFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'village_id' => Village::factory(),
            'days_before' => fake()->randomElement(LetterExpiryReminderSetting::DAYS_BEFORE_OPTIONS),
            'is_active' => true,
            'activated_at' => now(),
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
