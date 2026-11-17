<?php

namespace Database\Factories;

use App\Enums\DisasterAlertLevel;
use App\Enums\DisasterAlertType;
use App\Models\DisasterAlert;
use App\Models\IntegrationClient;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DisasterAlert>
 */
class DisasterAlertFactory extends Factory
{
    public function definition(): array
    {
        return [
            'integration_client_id' => IntegrationClient::factory()->sigap(),
            'village_id' => fn (array $attributes) => IntegrationClient::query()->whereKey($attributes['integration_client_id'])->value('village_id'),
            'external_id' => 'gempa-'.fake()->unique()->numerify('#####'),
            'type' => DisasterAlertType::Gempa,
            'level' => DisasterAlertLevel::Waspada,
            'level_rank' => fn (array $attributes) => DisasterAlertLevel::from(
                $attributes['level'] instanceof DisasterAlertLevel ? $attributes['level']->value : $attributes['level'],
            )->rank(),
            'title' => 'Gempa M5.2 di 23 km barat daya Cibenda',
            'message' => 'Tetap tenang dan jauhi bangunan yang retak.',
            'magnitude' => 5.2,
            'depth_km' => 10,
            'location' => '23 km barat daya Cibenda',
            'link_url' => null,
            'occurred_at' => now()->subMinutes(5),
            'sent_at' => now()->subMinutes(4),
            'expires_at' => now()->addHours(6),
        ];
    }

    public function level(DisasterAlertLevel $level): static
    {
        return $this->state(fn () => ['level' => $level, 'level_rank' => $level->rank()]);
    }

    public function ended(): static
    {
        return $this->state(fn () => ['ended_at' => now()->subMinute()]);
    }

    public function dismissed(): static
    {
        return $this->state(fn () => ['dismissed_at' => now()->subMinute(), 'dismiss_reason' => 'Alarm palsu.']);
    }

    public function expired(): static
    {
        return $this->state(fn () => ['expires_at' => now()->subMinute()]);
    }
}
