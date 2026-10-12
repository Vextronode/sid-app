<?php

namespace Database\Factories;

use App\Models\NewsCategory;
use App\Models\Village;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<NewsCategory>
 */
class NewsCategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = Str::title(fake()->unique()->words(2, true));

        return [
            'village_id' => fn () => Village::query()->value('id') ?? Village::factory()->create()->id,
            'name' => $name,
            'slug' => Str::slug($name),
        ];
    }
}
