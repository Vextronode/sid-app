<?php

namespace Database\Factories;

use App\Models\ApprovalFlow;
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
            'flow_id' => ApprovalFlow::factory(),
            'current_step_order' => 1,
            'rejected_at_step' => null,
            'is_overdue' => false,
            'expires_at' => null,
            'submitted_at' => now(),
            'processed_at' => null,
        ];
    }


    /**
     * Helper state: surat sedang berjalan (in_progress) di step tertentu.
     */
    public function inProgress(int $stepOrder = 2): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'in_progress',
            'current_step_order' => $stepOrder,
        ]);
    }

    /**
     * Helper state: surat sudah final approved (step is_final=true sudah
     * diputuskan) — letter_number & expires_at tetap diisi manual oleh
     * pemanggil sesuai kebutuhan test, factory ini hanya set status.
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
        ]);
    }

    /**
     * Helper state: surat ditolak di step tertentu (TERMINAL).
     */
    public function rejected(int $atStep = 1): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'rejected',
            'rejected_at_step' => $atStep,
        ]);
    }
}
