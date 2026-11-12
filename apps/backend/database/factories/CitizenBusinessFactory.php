<?php

namespace Database\Factories;

use App\Enums\BusinessCategory;
use App\Enums\CimartApplicationStatus;
use App\Models\CitizenBusiness;
use App\Models\Letter;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CitizenBusiness>
 */
class CitizenBusinessFactory extends Factory
{
    public function definition(): array
    {
        return [
            'letter_id' => Letter::factory(),
            'village_id' => fn (array $attributes) => Letter::query()->whereKey($attributes['letter_id'])->value('village_id'),
            'citizen_id' => null,
            'business_name' => 'Warung '.fake()->lastName(),
            'business_activity' => 'Warung kopi',
            'category' => BusinessCategory::Kuliner,
            'email' => fake()->safeEmail(),
            'phone' => '0812'.fake()->numerify('########'),
            'address' => fake()->streetAddress(),
            'cimart_status' => null,
        ];
    }

    public function cimart(CimartApplicationStatus $status): static
    {
        return $this->state(fn (array $attributes) => [
            'cimart_status' => $status,
            'cimart_requested_at' => now()->subDay(),
            'cimart_decided_at' => in_array($status, [CimartApplicationStatus::Accepted, CimartApplicationStatus::Rejected], true) ? now() : null,
            'cimart_note' => $status === CimartApplicationStatus::Rejected ? 'Foto usaha tidak sesuai.' : null,
            'cimart_cancelled_at' => $status === CimartApplicationStatus::Cancelled ? now() : null,
        ]);
    }
}
