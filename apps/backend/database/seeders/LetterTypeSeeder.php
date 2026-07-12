<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\LetterType;

class LetterTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $letterTypes = [
            [
                'code' => '005',
                'name' => 'Surat Keterangan Tidak Mampu',
                'description' => 'Surat keterangan yang menyatakan bahwa seseorang tidak mampu secara finansial.',
                'template' => null,
                'verification_type' => 'manual',
                'requirement_info' => '- Fotokopi KTP',
                'assigned_role' => null,
                'validity_days' => null,
                'is_active' => true,
            ],
            [
                'code' => '141.3',
                'name' => 'Surat Keterangan Catatan Kepolisian',
                'description' => 'Surat keterangan yang diterbitkan oleh kepolisian untuk keperluan tertentu.',
                'template' => null,
                'verification_type' => 'manual',
                'requirement_info' => '- Fotokopi KTP',
                'assigned_role' => null,
                'validity_days' => null,
                'is_active' => true,
            ],
            [
                'code' => '331.1',
                'name' => 'Surat Keterangan Domisili',
                'description' => 'Surat keterangan yang menyatakan domisili seseorang di suatu wilayah.',
                'template' => null,
                'verification_type' => 'manual',
                'requirement_info' => '- Fotokopi KTP',
                'assigned_role' => null,
                'validity_days' => null,
                'is_active' => true,
            ],
        ];

        foreach ($letterTypes as $letterType) {
            LetterType::create($letterType);
        }
    }
}
