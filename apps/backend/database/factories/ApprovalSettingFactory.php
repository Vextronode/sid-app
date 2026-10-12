<?php

namespace Database\Factories;

use App\Enums\ApprovalLevel;
use App\Models\ApprovalSetting;
use App\Models\Village;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApprovalSetting>
 */
class ApprovalSettingFactory extends Factory
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
            'approval_level' => fake()->randomElement(ApprovalLevel::cases()),
            'deadline_hours' => 24,
            'reminder_hours' => 12,
            'is_active' => true,
        ];
    }
}
