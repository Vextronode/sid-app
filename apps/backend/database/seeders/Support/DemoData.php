<?php

declare(strict_types=1);

namespace Database\Seeders\Support;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Data bersama seeder demo Desa Cibenda. Nama dan angka acak dibangkitkan
 * dari mt_rand yang di-seed tetap, supaya hasil seeding sama setiap kali
 * dan tidak bergantung pada faker (tidak terpasang di build produksi).
 */
final class DemoData
{
    public const DEMO_PASSWORD = 'Password123!';

    public const VILLAGE_CODE = '3218032001';

    /** Kode wilayah kecamatan Parigi, Pangandaran: awalan NIK dan No. KK. */
    public const DISTRICT_CODE = '321803';

    /** Nomor urut dusun (akhiran kode dusun) => nama dusun. */
    public const HAMLETS = [
        1 => 'Patrol',
        2 => 'Sinargalih',
        3 => 'Cibenda',
        4 => 'Budiasih',
        5 => 'Sucen',
    ];

    public const MALE_NAMES = [
        'Asep', 'Ujang', 'Dadang', 'Cecep', 'Dedi', 'Yayan', 'Iwan', 'Agus', 'Ade', 'Endang',
        'Jajang', 'Engkos', 'Wawan', 'Tatang', 'Encep', 'Aep', 'Deden', 'Rahmat', 'Hendra', 'Yusuf',
        'Ahmad', 'Dodi', 'Rudi', 'Budi', 'Eman', 'Kosim', 'Dudung', 'Ruhiyat', 'Nandang', 'Oman',
        'Rizki', 'Fajar', 'Ilham', 'Gilang', 'Rendi', 'Taufik', 'Ridwan', 'Usep', 'Mamat', 'Sopian',
    ];

    public const FEMALE_NAMES = [
        'Euis', 'Neneng', 'Imas', 'Iis', 'Yati', 'Tini', 'Enok', 'Cucu', 'Entin', 'Nining',
        'Lilis', 'Dewi', 'Siti', 'Rina', 'Nurul', 'Wulan', 'Eneng', 'Popon', 'Yeni', 'Ani',
        'Elis', 'Neni', 'Titin', 'Oneng', 'Rika', 'Sri', 'Nia', 'Mira', 'Intan', 'Fitri',
        'Ayu', 'Rosita', 'Atikah', 'Kokom', 'Iyah', 'Dede', 'Mimin', 'Eti', 'Herni', 'Yuyun',
    ];

    public const FAMILY_NAMES = [
        'Sutisna', 'Suryana', 'Hidayat', 'Kurniawan', 'Ramdani', 'Saepudin', 'Hermawan', 'Mulyana',
        'Sopandi', 'Rohendi', 'Setiawan', 'Nugraha', 'Permana', 'Sudrajat', 'Kusnadi', 'Maulana',
        'Gunawan', 'Supriatna', 'Wahyudi', 'Firmansyah', 'Rahayu', 'Lestari', 'Hasanah', 'Nurjanah',
        'Komariah', 'Rohmawati', 'Sulastri', 'Fauziah', 'Puspita', 'Handayani',
    ];

    /** Nama yang sudah dipakai, supaya tidak ada dua orang bernama sama. */
    private static array $usedNames = [];

    /**
     * Dipanggil di awal setiap seeder demo: menolak production lalu me-reset
     * RNG dan daftar nama, supaya seeder yang sama selalu menghasilkan
     * orang yang sama (seeding ulang memperbarui, bukan menggandakan).
     */
    public static function start(int $seed): void
    {
        self::ensureNotProduction();
        mt_srand($seed);
        self::$usedNames = [];
    }

    public static function ensureNotProduction(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('Demo seeders must not be run in production.');
        }
    }

    public static function pick(array $items): mixed
    {
        return $items[mt_rand(0, count($items) - 1)];
    }

    /**
     * Nama lengkap unik. Akhiran nama keluarga dipilih dari daftar umum;
     * nama perempuan memakai akhiran yang lazim untuk perempuan.
     */
    public static function uniqueName(string $gender): string
    {
        $firstNames = $gender === 'L' ? self::MALE_NAMES : self::FEMALE_NAMES;
        $lastNames = $gender === 'L'
            ? array_slice(self::FAMILY_NAMES, 0, 20)
            : array_slice(self::FAMILY_NAMES, 20);

        do {
            $name = self::pick($firstNames).' '.self::pick($lastNames);
        } while (isset(self::$usedNames[$name]));

        self::$usedNames[$name] = true;

        return $name;
    }

    /** Menandai nama asli (perangkat desa) agar tidak dipakai nama acak. */
    public static function reserveName(string $name): void
    {
        self::$usedNames[$name] = true;
    }

    /**
     * NIK 16 digit: kode kecamatan, tanggal lahir DDMMYY (DD+40 untuk
     * perempuan), lalu nomor urut 4 digit.
     */
    public static function nik(string $gender, string $dateOfBirth, int $sequence): string
    {
        [$year, $month, $day] = explode('-', $dateOfBirth);
        $day = (int) $day + ($gender === 'P' ? 40 : 0);

        return sprintf('%s%02d%s%s%04d', self::DISTRICT_CODE, $day, $month, substr($year, 2), $sequence);
    }

    /** Tanggal lahir acak untuk umur $minAge sampai $maxAge tahun. */
    public static function birthDate(int $minAge, int $maxAge): string
    {
        $year = (int) now()->year - mt_rand($minAge, $maxAge);

        return sprintf('%04d-%02d-%02d', $year, mt_rand(1, 12), mt_rand(1, 28));
    }

    /**
     * Menyalin aset gambar seeder ke disk public dan mengembalikan path-nya.
     * Nama tujuan tetap, jadi seeding ulang menimpa berkas yang sama.
     */
    public static function publishAsset(string $asset, string $directory): string
    {
        $source = database_path('seeders/assets/'.$asset);
        $path = trim($directory, '/').'/seed-'.basename($asset);

        Storage::disk('public')->put($path, File::get($source));

        return $path;
    }
}
