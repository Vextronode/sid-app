<?php

namespace Database\Seeders;

use App\Models\NewsCategory;
use App\Models\Village;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class NewsCategorySeeder extends Seeder
{
    /**
     * Kategori berita bawaan tiap desa. Petugas Desa dapat menambah,
     * mengubah, atau menghapus (selama belum dipakai) dari aplikasi.
     */
    private const DEFAULTS = [
        'Umum',
        'Pengumuman',
        'Infrastruktur',
        'Pendidikan',
        'Kesehatan',
        'Lingkungan',
        'Budaya',
        'Kegiatan Warga',
    ];

    public function run(): void
    {
        foreach (Village::query()->pluck('id') as $villageId) {
            foreach (self::DEFAULTS as $name) {
                NewsCategory::query()->firstOrCreate(
                    ['village_id' => $villageId, 'slug' => Str::slug($name)],
                    ['name' => $name],
                );
            }
        }
    }
}
