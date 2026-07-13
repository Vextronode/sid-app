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
            'name' => 'Desa Cibenda',
            'code' => '321001',
            'head_name' => 'John Doe',
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
                'name' => $hamletName,
            ]);

            
            for ($rwNum = 1; $rwNum <= 2; $rwNum++) {
                $rw = $hamlet->rws()->create([
                    'number' => str_pad($rwNum, 2, '0', STR_PAD_LEFT),
                ]);

                for ($rtNum = 1; $rtNum <= 2; $rtNum++) {
                    $rw->rts()->create([
                        'number' => str_pad($rtNum, 2, '0', STR_PAD_LEFT),
                    ]);
                }
            }
        }
    }
}