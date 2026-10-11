<?php

namespace Database\Factories;

use App\Models\ApprovalFlow;
use App\Models\Village;
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
    protected $model = ApprovalFlow::class;

    public function definition(): array
    {
        return [
            'village_id' => fn () => Village::query()->value('id') ?? Village::factory()->create()->id,
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'is_active' => true,
        ];
    }
}
