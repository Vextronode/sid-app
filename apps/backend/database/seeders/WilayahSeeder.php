<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Village;
use App\Models\Hamlet;

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
            $hamlet = $village->hamlets()->create([
                'name' => $hamletName,
            ]);

            // tiap dusun memiliki 2 RW, dan tiap RW memiliki 2 RT
            for($rwNum=1; $rwNum <= 2; $rwNum++){
                $rw = $hamlet->rws()->create([
                    'number' => str_pad($rwNum, 2, '0', STR_PAD_LEFT), // "01", "02"
                ]);

                for($rtNum=1; $rtNum <= 2; $rtNum++){
                    $rw->rts()->create([
                        'number' => str_pad($rtNum, 2, '0', STR_PAD_LEFT), // "01", "02"
                    ]);
                }
            }
        }
    }
}
