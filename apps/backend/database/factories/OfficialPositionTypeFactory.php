<?php

namespace Database\Factories;

use App\Models\OfficialPositionType;
use App\Models\Village;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<OfficialPositionType>
 */
class OfficialPositionTypeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $label = 'Kaur '.Str::title(fake()->unique()->words(2, true));

        return [
            'village_id' => fn () => Village::query()->value('id') ?? Village::factory()->create()->id,
            'code' => Str::slug($label, '_'),
            'label' => $label,
            'is_single_occupant' => true,
            'sort_order' => 0,
            'is_active' => true,
        ];
    }

    public function code(string $code, ?string $label = null): static
    {
        return $this->state(fn (array $attributes) => [
            'code' => $code,
            'label' => $label ?? Str::headline($code),
        ]);
    }
}
