<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\Village;
use Illuminate\Database\Seeder;
use RuntimeException;

class DemoVillageSeeder extends Seeder
{
    private const VILLAGE_CODE = '3218032001';

    public function run(): void
    {
        $this->ensureNotProduction();

        $village = Village::query()->updateOrCreate(
            ['code' => self::VILLAGE_CODE],
            [
                'name' => 'Desa Cibenda',
                'head_name' => 'Kepala Desa Demo',
                'address' => 'Jl. Raya Cibenda, Kecamatan Parigi, Kabupaten Pangandaran',
                'phone' => '080000000000',
            ],
        );

        // New village-creation flows must call OccupationService::seedDefaultsForVillage().
        for ($hamletNumber = 1; $hamletNumber <= 5; $hamletNumber++) {
            $hamletCode = sprintf('%s%02d', self::VILLAGE_CODE, $hamletNumber);
            $hamlet = Hamlet::query()->updateOrCreate(
                ['village_id' => $village->id, 'code' => $hamletCode],
                [
                    'name' => 'Dusun Demo '.$hamletNumber,
                    'is_active' => true,
                ],
            );

            for ($rwNumber = 1; $rwNumber <= 5; $rwNumber++) {
                $rwLabel = sprintf('%03d', $rwNumber);
                $rw = Rw::query()->updateOrCreate(
                    ['hamlet_id' => $hamlet->id, 'number' => $rwLabel],
                    [
                        'village_id' => $village->id,
                        'full_label' => 'RW '.$rwLabel,
                        'is_active' => true,
                    ],
                );

                for ($rtNumber = 1; $rtNumber <= 5; $rtNumber++) {
                    $rtLabel = sprintf('%03d', $rtNumber);
                    Rt::query()->updateOrCreate(
                        ['rw_id' => $rw->id, 'number' => $rtLabel],
                        [
                            'village_id' => $village->id,
                            'full_label' => "RT {$rtLabel} / RW {$rwLabel}",
                            'is_active' => true,
                        ],
                    );
                }
            }
        }
    }

    private function ensureNotProduction(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('Demo seeders must not be run in production.');
        }
    }
}
