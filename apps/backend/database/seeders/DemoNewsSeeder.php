<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\News;
use App\Models\NewsCategory;
use App\Models\User;
use App\Models\Village;
use Database\Seeders\Support\DemoData;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Sepuluh berita contoh, ditulis oleh akun demo_admin. Thumbnail dari
 * Unsplash (Unsplash License), disimpan sebagai aset seeder.
 */
class DemoNewsSeeder extends Seeder
{
    /**
     * @var array<int, array{title: string, image: string, categories: array<int, string>, days_ago: int, content: array<int, string>}>
     */
    private const ARTICLES = [
        [
            'title' => 'Panen Raya Padi Musim Gadu di Dusun Sinargalih',
            'image' => 'panen-padi',
            'categories' => ['kegiatan-warga', 'umum'],
            'days_ago' => 2,
            'content' => [
                'Kelompok tani di Dusun Sinargalih menggelar panen raya padi musim gadu. Kegiatan dimulai sejak pagi dan diikuti puluhan petani bersama keluarga mereka.',
                'Hasil panen tahun ini dinilai lebih baik dibanding musim sebelumnya. Saluran irigasi yang diperbaiki awal tahun membuat sawah mendapat air cukup sepanjang masa tanam.',
                'Pemerintah Desa Cibenda mengajak petani menyisihkan sebagian gabah untuk cadangan pangan keluarga dan memanfaatkan lumbung desa sebelum menjual hasil panen.',
            ],
        ],
        [
            'title' => 'Posyandu Balita Kembali Dibuka Setiap Minggu Kedua',
            'image' => 'posyandu',
            'categories' => ['kesehatan', 'pengumuman'],
            'days_ago' => 5,
            'content' => [
                'Pelayanan posyandu balita di seluruh dusun kembali dijadwalkan setiap minggu kedua tiap bulan, pukul 08.00 sampai 11.00 WIB.',
                'Layanan meliputi penimbangan, pengukuran tinggi badan, imunisasi, pemberian vitamin A, serta konsultasi gizi bersama bidan desa dan kader posyandu.',
                'Orang tua diminta membawa buku KIA dan memastikan anak dalam kondisi sehat. Jadwal per dusun dapat ditanyakan kepada kader posyandu atau Kepala Dusun setempat.',
            ],
        ],
        [
            'title' => 'Pengaspalan Jalan Penghubung Dusun Patrol – Budiasih Dimulai',
            'image' => 'jalan-desa',
            'categories' => ['infrastruktur'],
            'days_ago' => 9,
            'content' => [
                'Pekerjaan pengaspalan jalan penghubung antara Dusun Patrol dan Dusun Budiasih mulai dikerjakan minggu ini. Ruas jalan sepanjang kurang lebih 800 meter tersebut menjadi jalur utama warga menuju sawah dan pasar.',
                'Pekerjaan dibiayai Dana Desa tahun berjalan dan dikerjakan secara swakelola dengan melibatkan tenaga kerja dari warga setempat.',
                'Selama pengerjaan, kendaraan roda empat diimbau memakai jalur alternatif. Warga yang melintas diminta berhati-hati dan mengikuti arahan petugas di lapangan.',
            ],
        ],
        [
            'title' => 'BUMDesa Cibenda Buka Lapak Hasil Tani di Pasar Desa',
            'image' => 'pasar-sayur',
            'categories' => ['umum', 'kegiatan-warga'],
            'days_ago' => 14,
            'content' => [
                'BUMDesa Cibenda membuka lapak khusus hasil tani warga di pasar desa. Petani dapat menitipkan sayur, buah, dan hasil kebun lain untuk dijual dengan harga yang disepakati bersama.',
                'Program ini bertujuan memperpendek rantai penjualan sehingga petani mendapat harga yang lebih baik, sementara pembeli memperoleh produk segar langsung dari kebun.',
                'Warga yang ingin bergabung dapat mendaftar di kantor BUMDesa pada jam kerja dengan membawa fotokopi KTP.',
            ],
        ],
        [
            'title' => 'Bantuan Perlengkapan Sekolah untuk Siswa SD',
            'image' => 'sekolah',
            'categories' => ['pendidikan'],
            'days_ago' => 20,
            'content' => [
                'Pemerintah Desa Cibenda menyalurkan bantuan perlengkapan sekolah kepada siswa sekolah dasar dari keluarga kurang mampu di lima dusun.',
                'Paket bantuan berisi tas, buku tulis, alat tulis, dan seragam. Data penerima disusun bersama Ketua RT dan pihak sekolah agar bantuan tepat sasaran.',
                'Pemerintah desa berharap bantuan ini dapat meringankan beban orang tua dan menjaga semangat belajar anak-anak di awal semester.',
            ],
        ],
        [
            'title' => 'Kerja Bakti Bersih Pantai Bersama Karang Taruna',
            'image' => 'bersih-pantai',
            'categories' => ['lingkungan', 'kegiatan-warga'],
            'days_ago' => 26,
            'content' => [
                'Karang Taruna Desa Cibenda bersama warga menggelar kerja bakti membersihkan pesisir pantai selatan desa pada Minggu pagi.',
                'Sampah yang terkumpul sebagian besar berupa plastik kemasan dan sampah kiriman dari laut. Sampah dipilah di lokasi, lalu yang masih bernilai disetorkan ke bank sampah desa.',
                'Kegiatan serupa direncanakan rutin setiap bulan. Warga diajak tidak membuang sampah ke sungai dan saluran air yang bermuara ke pantai.',
            ],
        ],
        [
            'title' => 'Nelayan Cibenda Terima Bantuan Alat Keselamatan',
            'image' => 'perahu-nelayan',
            'categories' => ['umum'],
            'days_ago' => 33,
            'content' => [
                'Kelompok nelayan Desa Cibenda menerima bantuan alat keselamatan berupa pelampung dan jaket keselamatan untuk dipakai saat melaut.',
                'Penyerahan bantuan disertai pelatihan singkat tentang keselamatan di laut, termasuk cara membaca informasi cuaca dan tinggi gelombang sebelum berangkat.',
                'Nelayan diimbau selalu memakai jaket keselamatan dan tidak memaksakan diri melaut ketika ada peringatan gelombang tinggi di perairan selatan Pangandaran.',
            ],
        ],
        [
            'title' => 'Pawai Budaya Meriahkan Peringatan Hari Jadi Desa',
            'image' => 'pawai-budaya',
            'categories' => ['budaya', 'kegiatan-warga'],
            'days_ago' => 40,
            'content' => [
                'Peringatan hari jadi Desa Cibenda dimeriahkan pawai budaya yang diikuti perwakilan dari setiap dusun. Peserta mengenakan pakaian adat dan membawa hasil bumi sebagai simbol syukur.',
                'Rute pawai dimulai dari kantor desa dan berakhir di lapangan desa, tempat digelarnya pentas seni anak-anak dan bazar UMKM warga.',
                'Kegiatan ini menjadi ajang silaturahmi antarwarga sekaligus upaya melestarikan seni dan budaya Sunda di kalangan generasi muda.',
            ],
        ],
        [
            'title' => 'Gerakan Tanam Serentak Dimulai Awal Musim Hujan',
            'image' => 'tanam-padi',
            'categories' => ['umum', 'lingkungan'],
            'days_ago' => 48,
            'content' => [
                'Memasuki awal musim hujan, kelompok tani Desa Cibenda memulai gerakan tanam padi serentak di seluruh hamparan sawah desa.',
                'Tanam serentak membantu memutus siklus hama karena masa tanam dan panen di setiap petak menjadi seragam.',
                'Penyuluh pertanian mendampingi petani dalam pemilihan benih unggul dan pengaturan jarak tanam agar hasil panen lebih optimal.',
            ],
        ],
        [
            'title' => 'Pelayanan Surat Kini Bisa Diajukan Secara Daring',
            'image' => 'sawah-kelapa',
            'categories' => ['pengumuman'],
            'days_ago' => 55,
            'content' => [
                'Warga Desa Cibenda kini dapat mengajukan permohonan surat keterangan secara daring melalui Sistem Informasi Desa tanpa harus datang ke kantor desa sejak awal.',
                'Permohonan diperiksa oleh Ketua RT, lalu disetujui Kepala Desa. Warga dapat memantau status permohonan dan mendapat notifikasi ketika surat sudah selesai.',
                'Warga yang belum memiliki akun dapat menghubungi Ketua RT atau datang ke kantor desa pada jam pelayanan untuk dibantu pendaftarannya.',
            ],
        ],
    ];

    public function run(): void
    {
        DemoData::ensureNotProduction();

        $village = Village::query()->where('code', DemoData::VILLAGE_CODE)->firstOrFail();
        $author = User::query()->where('username', 'demo_admin')->firstOrFail();
        $categories = NewsCategory::query()->where('village_id', $village->id)->pluck('id', 'slug');

        foreach (self::ARTICLES as $article) {
            $news = News::query()->updateOrCreate(
                ['slug' => Str::slug($article['title'])],
                [
                    'village_id' => $village->id,
                    'author_id' => $author->id,
                    'title' => $article['title'],
                    'content' => implode("\n\n", $article['content']),
                    'thumbnail' => DemoData::publishAsset("news/{$article['image']}.webp", 'news'),
                    'is_published' => true,
                    'published_at' => now()->subDays($article['days_ago'])->setTime(9, 0),
                ],
            );

            $news->categories()->sync(
                collect($article['categories'])->map(fn (string $slug) => $categories[$slug])->all(),
            );
        }
    }
}
