<?php

namespace Database\Factories;

use App\Models\LetterCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

class LetterCategoryFactory extends Factory
{
    protected $model = LetterCategory::class;

    private const CODES = [
        'approval_normal',
        'upload_mandiri',
        'dokumen_pendukung',
        'update_data',
    ];

    public function definition(): array
    {
        return [
            'code' => $this->nextCode(),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'handler_class' => 'App\\Handlers\\DefaultLetterCategoryHandler',
            'is_active' => true,
        ];
    }

    public function create($attributes = [], ?Model $parent = null)
    {
        if (empty($attributes)) {
            $usedCodes = LetterCategory::query()->pluck('code')->all();
            $available = array_values(array_diff(self::CODES, $usedCodes));

            if (empty($available)) {
                return LetterCategory::query()->inRandomOrder()->firstOrFail();
            }
        }

        return parent::create($attributes, $parent);
    }

    private function nextCode(): string
    {
        $usedCodes = LetterCategory::query()->pluck('code')->all();

        $available = array_values(array_diff(self::CODES, $usedCodes));

        if (empty($available)) {
            return self::CODES[array_rand(self::CODES)];
        }

        return $available[array_rand($available)];
    }
}
