<?php

namespace Database\Seeders;

use App\Models\OfficialPositionType;
use App\Models\Village;
use Illuminate\Database\Seeder;

class OfficialPositionTypeSeeder extends Seeder
{
    /**
     * Jenis jabatan tanpa akun bawaan tiap desa, berurutan sesuai tampilan
     * Profil Desa. Petugas Desa dapat menambah atau mengubahnya dari aplikasi.
     */
    private const DEFAULTS = [
        'kasi_kesejahteraan' => 'Kasi Kesejahteraan',
        'kasi_pelayanan' => 'Kasi Pelayanan',
        'kaur_perencanaan' => 'Kaur Perencanaan',
        'kaur_keuangan' => 'Kaur Keuangan',
        'staf_sipades' => 'Staf SIPADES',
        'staf_siskeudes' => 'Staf SISKEUDES',
    ];

    public function run(): void
    {
        foreach (Village::query()->pluck('id') as $villageId) {
            $order = 0;

            foreach (self::DEFAULTS as $code => $label) {
                OfficialPositionType::query()->firstOrCreate(
                    ['village_id' => $villageId, 'code' => $code],
                    ['label' => $label, 'sort_order' => ++$order],
                );
            }
        }
    }
}
