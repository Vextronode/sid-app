<?php

namespace Database\Factories;

use App\Models\FlowStep;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FlowStep>
 */
class FlowStepFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'flow_id' => ApprovalFlow::factory(),
            'step_order' => 1,
            'approver_position' => 'rt',
            'is_final' => false,
        ];
    }
}
