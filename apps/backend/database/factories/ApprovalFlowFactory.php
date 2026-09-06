<?php

namespace Database\Factories;

use App\Models\ApprovalFlow;
use App\Models\LetterCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApprovalFlow>
 */
class ApprovalFlowFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_id' => LetterCategory::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'is_active' => true,
        ];
    }
}
