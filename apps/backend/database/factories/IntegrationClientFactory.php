<?php

namespace Database\Factories;

use App\Enums\IntegrationAbility;
use App\Models\IntegrationClient;
use App\Models\Village;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<IntegrationClient>
 */
class IntegrationClientFactory extends Factory
{
    public function definition(): array
    {
        return [
            'village_id' => Village::factory(),
            'slug' => 'client-'.fake()->unique()->numerify('####'),
            'name' => 'Aplikasi '.fake()->lastName(),
            'abilities' => IntegrationAbility::values(),
            'is_active' => true,
        ];
    }

    /** Client Cimart dengan ability bawaannya. */
    public function cimart(): static
    {
        return $this->state(fn () => [
            'slug' => 'cimart',
            'name' => 'Cimart',
            'abilities' => [
                IntegrationAbility::SellerApplicationsRead->value,
                IntegrationAbility::SellerApplicationsUpdate->value,
            ],
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    /**
     * @param  list<string>  $abilities
     */
    public function withAbilities(array $abilities): static
    {
        return $this->state(fn () => ['abilities' => $abilities]);
    }
}
