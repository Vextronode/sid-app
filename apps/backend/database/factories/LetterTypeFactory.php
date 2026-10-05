<?php

namespace Database\Factories;

use App\Models\ApprovalFlow;
use App\Models\LetterCategory;
use App\Models\LetterType;
use App\Models\Village;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LetterType>
 */
class LetterTypeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->bothify('SRT-####'),
            'village_id' => fn () => Village::query()->value('id') ?? Village::factory()->create()->id,
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'template' => null,
            'verification_type' => 'manual',
            'requirement_info' => fake()->sentence(),
            'category_id' => LetterCategory::query()->inRandomOrder()->value('id') ?? LetterCategory::factory(),
            'flow_id' => ApprovalFlow::factory(),
            'assigned_role' => 'kasi_pelayanan',
            'validity_days' => 30,
            'is_active' => true,
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (LetterType $letterType): void {
            if ($letterType->flow_id && $letterType->village_id !== $letterType->flow?->village_id) {
                $letterType->village_id = $letterType->flow?->village_id;
            }
        });
    }
}
