<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Village;
use App\Models\Hamlet;
use App\Models\Rw;
use App\Models\Rt;

class WilayahSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $village = Village::create([
            'name' => 'Desa Cibenda',
            'head_name' => 'John Doe',
        ]);

        $hamlets = [
            'Cibenda Utara',
            'Cibenda',
            'Cibenda Timur',
            'Cibenda Barat',
            'Cibenda Selatan'
        ];

        foreach ($hamlets as $hamletName) {
            $hamlet = Hamlet::create([
                'village_id' => $village->id,
                'name' => $hamletName,
                'code' => strtoupper($hamletName),
                'is_active' => true,
            ]);

            // tiap dusun memiliki 2 RW, dan tiap RW memiliki 2 RT
            for($rwNum=1; $rwNum <= 2; $rwNum++){
                $rwModel = Rw::create([
                    'hamlet_id' => $hamlet->id,
                    'number' => str_pad($rwNum, 3, '0', STR_PAD_LEFT),
                    'full_label' => 'RW '.str_pad($rwNum,3,'0',STR_PAD_LEFT),
                    'is_active' => true,
                ]);

                for($rtNum=1; $rtNum <= 2; $rtNum++){
                    Rt::create([
                        'rw_id' => $rwModel->id,
                        'number' => str_pad($rtNum,3,'0',STR_PAD_LEFT),
                        'full_label' => 'RT '.str_pad($rtNum,3,'0',STR_PAD_LEFT).'/RW '.str_pad($rwNum,3,'0',STR_PAD_LEFT),
                        'is_active' => true,
                    ]);
                }
            }
        }
    }
}
