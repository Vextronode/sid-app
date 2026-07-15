<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Village;

class WilayahSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $village = Village::create([
            'code' => '1234567890',
            'name' => 'Desa Cibenda',
            'head_name' => 'John Doe',
            'address' => 'Jl. Raya Cibenda No. 1',
            'phone' => '081234567890',
        ]);

        $hamlets = [
            'Cibenda Utara',
            'Cibenda',
            'Cibenda Timur',
            'Cibenda Barat',
            'Cibenda Selatan',
        ];

        foreach ($hamlets as $hamletName) {
            $hamlet = $village->hamlets()->create([
                'code' => '1234567890' . str_pad($hamletName, 2, '0', STR_PAD_LEFT),
                'name' => $hamletName,
                'is_active' => true,
                'village_id' => $village->id,
            ]);

            
            for ($rwNum = 1; $rwNum <= 2; $rwNum++) {
                $rw = $hamlet->rws()->create([
                    'hamlet_id' => $hamlet->id,
                    'number' => str_pad($rwNum, 2, '0', STR_PAD_LEFT),
                    'full_label' => 'RW ' . str_pad($rwNum, 2, '0', STR_PAD_LEFT) . ' ' . $hamletName,
                    'is_active' => true,
                ]);

                for ($rtNum = 1; $rtNum <= 2; $rtNum++) {
                    $rw->rts()->create([
                        'rw_id' => $rw->id,
                        'number' => str_pad($rtNum, 2, '0', STR_PAD_LEFT),
                        'is_active' => true,
                        'full_label' => 'RT ' . str_pad($rtNum, 2, '0', STR_PAD_LEFT) . ' RW ' . str_pad($rwNum, 2, '0', STR_PAD_LEFT) . ' ' . $hamletName,
                    ]);
                }
            }
        }
    }
}