<?php

namespace Database\Factories;

use App\Models\LetterCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

class LetterCategoryFactory extends Factory
{
    protected $model = LetterCategory::class;

    public function definition(): array
    {
        return [
            'code' => fake()->unique()->randomElement([
                'approval_normal',
                'upload_mandiri',
                'dokumen_pendukung',
                'update_data',
            ]),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'handler_class' => 'App\\Handlers\\DefaultLetterCategoryHandler',
            'is_active' => true,
        ];
    }
}
