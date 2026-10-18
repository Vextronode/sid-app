<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\Village;
use Database\Seeders\Support\DemoData;
use Illuminate\Database\Seeder;

class DemoVillageSeeder extends Seeder
{
    /** Visi dan misi dari desacibenda.id/visi-misi. */
    private const VISION = 'Optimalisasi pemberdayaan, ekonomi kerakyatan menuju Cibenda sejahtera dan mandiri.';

    private const MISSION = [
        'Menciptakan pemerintah Desa yang solid, akuntabel, professional dan proporsional serta mengedepankan sikap amanah dan ramah dalam pelayanan.',
        'Melaksanakan pembangunan infrastruktur dan meningkatkan pemberdayaan masyarakat yang terencana serta terukur.',
        'Meningkatkan kualitas sumberdaya manusia dalam kehidupan dunia Pendidikan, kehidupan beragama, penanganan keamanan dan ketertiban lingkungan serta peningkatan derajat Kesehatan bagi masyarakat.',
        'Mendorong perekonomian masyarakat desa dengan meningkatkan kapasitas BUMDesa, serta meningkatkan hasil produksi rumah tangga kecil.',
        'Memberikan fasilitas bagi program kepemudaan agar memiliki kekuatan, berkarakter serta memiliki daya saing yang tinggi dalam pengembangan olah raga, inovasi keterampilan serta potensi kreasi seni dan kebudayaan.',
    ];

    private const HISTORY = 'Desa Cibenda terletak di Kecamatan Parigi, Kabupaten Pangandaran, Jawa Barat, dengan luas wilayah 759,319 hektare. '
        .'Di sebelah utara desa berbatasan dengan Desa Bojong dan Desa Cintaratu, di sebelah timur dengan Desa Sukaresik, di sebelah barat dengan Desa Ciliang, '
        .'dan di sebelah selatan langsung menghadap Samudra Hindia.'
        ."\n\n"
        .'Wilayah desa terbagi menjadi lima dusun, yaitu Patrol, Sinargalih, Cibenda, Budiasih, dan Sucen. '
        .'Lahannya dimanfaatkan untuk persawahan, perkebunan, kolam ikan, dan permukiman, sehingga sebagian besar warga hidup dari bertani, berkebun, dan melaut. '
        .'Kedekatan dengan pesisir selatan Pangandaran juga membuka peluang usaha di bidang perikanan dan wisata.';

    public function run(): void
    {
        DemoData::ensureNotProduction();

        $village = Village::query()->updateOrCreate(
            ['code' => DemoData::VILLAGE_CODE],
            [
                'name' => 'Desa Cibenda',
                'head_name' => 'Dede Rusliana',
                'address' => 'Jl. Raya Cibenda, Kecamatan Parigi, Kabupaten Pangandaran',
                'phone' => '(0265) 2640613',
                'district' => 'Parigi',
                'regency' => 'Pangandaran',
                'province' => 'Jawa Barat',
                'postal_code' => '46393',
                'email' => 'kantordesacibenda@gmail.com',
                'area_ha' => 759.319,
                // Tampilan halaman publik; Petugas Desa dapat menggantinya
                // dari Kelola Profil Desa. Gambar awal memakai aset frontend.
                'logo' => '/assets/image/lambang-kabupaten-pangandaran.webp',
                'hero_image' => '/assets/image/beranda/hero-pemandangan.jpg',
                'hero_photo_credit' => null,
                'office_hours' => 'Senin – Jumat, 08.00 – 16.00 WIB',
                // Titik "Kantor Pemerintahan Desa Cibenda" di Google Maps.
                'latitude' => -7.6803137,
                'longitude' => 108.5513816,
                'history' => self::HISTORY,
                'vision' => self::VISION,
                // Satu butir misi per baris; halaman Profil Desa memecahnya per baris.
                'mission' => implode("\n", self::MISSION),
            ],
        );

        // New village-creation flows must call OccupationService::seedDefaultsForVillage().
        foreach (DemoData::HAMLETS as $hamletNumber => $hamletName) {
            $hamletCode = sprintf('%s%02d', DemoData::VILLAGE_CODE, $hamletNumber);
            $hamlet = Hamlet::query()->updateOrCreate(
                ['village_id' => $village->id, 'code' => $hamletCode],
                [
                    'name' => $hamletName,
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
}
