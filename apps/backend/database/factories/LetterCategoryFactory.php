<?php

namespace Database\Factories;

use App\Models\LetterCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

class LetterCategoryFactory extends Factory
{
    protected $model = LetterCategory::class;

    private const CODES = [
        'approval_normal',
        'upload_mandiri',
        'dokumen_pendukung',
        'update_data',
    ];

    /**
     * Index penunjuk kode berikutnya yang akan dipakai. Statis, di memori,
     * supaya tetap aman walau beberapa LetterCategory dibuat sekaligus
     * dalam satu batch (mis. Letter::factory()->count(3)->create()) sebelum
     * ada row yang benar-benar ter-insert ke database.
     */
    private static int $cursor = 0;

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

    /**
     * Kolom `code` adalah enum + unique di level database (hanya 4 nilai
     * valid: lihat migration create_letter_categories_table). Ambil kode
     * berikutnya secara round-robin dari cursor statis, bukan query DB,
     * supaya aman dipanggil berkali-kali dalam satu batch factory sebelum
     * baris sebelumnya ter-insert.
     */
    private function nextCode(): string
    {
        $code = self::CODES[self::$cursor % count(self::CODES)];
        self::$cursor++;

        return $code;
    }
}
