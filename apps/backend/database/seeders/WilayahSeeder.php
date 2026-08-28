<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\Village;
use App\Models\Citizen;
use App\Models\User;
use App\Models\Official;

class WilayahSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // ==========================================
        // 1. BUAT DATA DESA & WILAYAH
        // ==========================================

        $village = Village::create([
            'code' => '3218032001',
            'name' => 'Desa Cibenda',
            'head_name' => null,
            'address' => 'Jl. Raya Cibenda No. 1, Kec. Parigi, Kab. Pangandaran',
            'phone' => '081234567890',
        ]);

        // Data yang diberikan hanya mencantumkan
        // RW dan RT, tidak ada pembagian dusun.
        // Maka digunakan 1 dusun teknis sebagai parent wilayah.
        $hamlet = $village->hamlets()->create([
            'code' => '321803200101',
            'name' => 'Cibenda',
            'is_active' => true,
            'village_id' => $village->id,
        ]);

        // Mapping RW dan RT
        $rws = [];
        $rts = [];

        // ==========================================
        // RW 001 - RW 003
        // Masing-masing memiliki RT 001 & RT 002
        // ==========================================

        for ($rwNum = 1; $rwNum <= 3; $rwNum++) {
            $rwPad = str_pad($rwNum, 3, '0', STR_PAD_LEFT);
            $rwKey = "RW_{$rwPad}";

            $rw = $hamlet->rws()->create([
                'hamlet_id' => $hamlet->id,
                'number' => $rwPad,
                'full_label' => "RW {$rwPad}",
                'is_active' => true,
            ]);

            $rws[$rwKey] = $rw;

            for ($rtNum = 1; $rtNum <= 2; $rtNum++) {
                $rtPad = str_pad($rtNum, 3, '0', STR_PAD_LEFT);
                $rtKey = "RT_{$rtPad}_RW_{$rwPad}";

                $rt = $rw->rts()->create([
                    'rw_id' => $rw->id,
                    'number' => $rtPad,
                    'is_active' => true,
                    'full_label' => "RT {$rtPad} / RW {$rwPad}",
                ]);

                $rts[$rtKey] = $rt;
            }
        }

        // ==========================================
        // 2. DATA KETUA RW & KETUA RT
        // ==========================================

        $officialsData = [
            [
                'nik' => '3218030101010001',
                'name' => 'Ujang Sudrajat',
                'username' => 'rw001',
                'email' => 'rw01@example.com',
                'position' => 'rw',
                'role' => 'rw',
                'rw_key' => 'RW_001',
                'rt_key' => null,
            ],
            [
                'nik' => '3218030101010002',
                'name' => 'Maman Suherman',
                'username' => 'rt001_rw001',
                'email' => 'rt01rw01@example.com',
                'position' => 'rt',
                'role' => 'rt',
                'rw_key' => 'RW_001',
                'rt_key' => 'RT_001_RW_001',
            ],
            [
                'nik' => '3218030101010003',
                'name' => 'Asep Saepudin',
                'username' => 'rt002_rw001',
                'email' => 'rt02rw01@example.com',
                'position' => 'rt',
                'role' => 'rt',
                'rw_key' => 'RW_001',
                'rt_key' => 'RT_002_RW_001',
            ],
            [
                'nik' => '3218030101010004',
                'name' => 'Dede Kurniadi',
                'username' => 'rw002',
                'email' => 'rw02@example.com',
                'position' => 'rw',
                'role' => 'rw',
                'rw_key' => 'RW_002',
                'rt_key' => null,
            ],
            [
                'nik' => '3218030101010005',
                'name' => 'Agus Kusnandar',
                'username' => 'rt001_rw002',
                'email' => 'rt01rw02@example.com',
                'position' => 'rt',
                'role' => 'rt',
                'rw_key' => 'RW_002',
                'rt_key' => 'RT_001_RW_002',
            ],
            [
                'nik' => '3218030101010006',
                'name' => 'Iwan Setiawan',
                'username' => 'rt002_rw002',
                'email' => 'rt02rw02@example.com',
                'position' => 'rt',
                'role' => 'rt',
                'rw_key' => 'RW_002',
                'rt_key' => 'RT_002_RW_002',
            ],
            [
                'nik' => '3218030101010007',
                'name' => 'H. Dudung Hermawan',
                'username' => 'rw003',
                'email' => 'rw03@example.com',
                'position' => 'rw',
                'role' => 'rw',
                'rw_key' => 'RW_003',
                'rt_key' => null,
            ],
            [
                'nik' => '3218030101010008',
                'name' => 'Budi Santoso',
                'username' => 'rt001_rw003',
                'email' => 'rt01rw03@example.com',
                'position' => 'rt',
                'role' => 'rt',
                'rw_key' => 'RW_003',
                'rt_key' => 'RT_001_RW_003',
            ],
            [
                'nik' => '3218030101010009',
                'name' => 'Yayan Supriatna',
                'username' => 'rt002_rw003',
                'email' => 'rt02rw03@example.com',
                'position' => 'rt',
                'role' => 'rt',
                'rw_key' => 'RW_003',
                'rt_key' => 'RT_002_RW_003',
            ],
        ];

        foreach ($officialsData as $off) {
            $targetRw = $rws[$off['rw_key']];
            $targetRt = $off['rt_key']
                ? $rts[$off['rt_key']]
                : null;

            // ==========================================
            // CITIZEN
            // ==========================================

            $citizen = Citizen::create([
                'village_id' => $village->id,
                'nik' => $off['nik'],
                'nik_hash' => hash('sha256', $off['nik']),
                'name' => $off['name'],
                'date_of_birth' => '1980-01-01',
                'place_of_birth' => 'Pangandaran',
                'gender' => 'L',
                'address' => 'Desa Cibenda',
                'rt_id' => $targetRt
                    ? $targetRt->id
                    : $rts["RT_001_{$off['rw_key']}"]->id,
                'rw_id' => $targetRw->id,
                'hamlet_id' => $targetRw->hamlet_id,
                'no_kk' => $off['nik'],
                'marital_status' => 'kawin',
                'occupation' => 'Wiraswasta',
                'religion' => 'islam',
                'last_education' => 'sma',
                'domicile_status' => 'menetap',
                'current_domicile' => 'Desa Cibenda',
                'is_active' => true,
            ]);

            // ==========================================
            // USER
            // ==========================================

            $user = User::create([
                'village_id' => $village->id,
                'citizen_id' => $citizen->id,
                'name' => $citizen->name,
                'username' => $off['username'],
                'role' => $off['role'],
                'email' => $off['email'],
                'email_verified_at' => now(),
                'password' => Hash::make('Password123'),
                'is_active' => true,
            ]);

            // ==========================================
            // OFFICIAL
            // ==========================================

            Official::create([
                'citizen_id' => $citizen->id,
                'user_id' => $user->id,
                'position' => $off['position'],
                'village_id' => $village->id,
                'rt_id' => $targetRt ? $targetRt->id : null,
                'rw_id' => $targetRw->id,
                'hamlet_id' => $targetRw->hamlet_id,
                'started_at' => now()->toDateString(),
                'is_active' => true,
            ]);
        }

        // ==========================================
        // 3. DATA KEPALA DESA, KASI PELAYANAN & KADUS
        // ==========================================

        $staffData = [
            [
                'nik' => '3218030101010010',
                'name' => 'Desa Rusliana',
                'username' => 'Desa Rusliana',
                'email' => 'Desa_Rusliana@example.com',
                'role' => 'kepala_desa',
                'position' => 'kepala_desa',
                'rw_key' => 'RW_001',
                'rt_key' => 'RT_001_RW_001',
            ],
            [
                'nik' => '3218030101010011',
                'name' => 'Sakim Hidayat',
                'username' => 'Sakim Hidayat',
                'email' => 'Sakim_hidayat@example.com',
                'role' => 'kasi_pelayanan',
                'position' => 'kasi_pelayanan',
                'rw_key' => 'RW_001',
                'rt_key' => 'RT_001_RW_001',
            ],

            // =========================
            // KEPALA DUSUN
            // =========================

            [
                'nik' => '3218030101010012',
                'name' => 'Mamang Saepul',
                'username' => 'Mamang Saepul',
                'email' => 'kadus.cibenda@example.com',
                'role' => 'kadus',
                'position' => 'kadus',
                'rw_key' => 'RW_001',
                'rt_key' => 'RT_001_RW_001',
            ],
        ];

        foreach ($staffData as $staff) {

            $targetRw = $rws[$staff['rw_key']];
            $targetRt = $rts[$staff['rt_key']];

            // ==========================================
            // CITIZEN
            // ==========================================

            $citizen = Citizen::create([
                'village_id' => $village->id,
                'nik' => $staff['nik'],
                'nik_hash' => hash('sha256', $staff['nik']),
                'name' => $staff['name'],
                'date_of_birth' => '1978-01-01',
                'place_of_birth' => 'Pangandaran',
                'gender' => 'L',
                'address' => 'Desa Cibenda',
                'rt_id' => $targetRt->id,
                'rw_id' => $targetRw->id,
                'hamlet_id' => $hamlet->id,
                'no_kk' => $staff['nik'],
                'marital_status' => 'kawin',
                'occupation' => match ($staff['role']) {
                    'kepala_desa' => 'Kepala Desa',
                    'kasi_pelayanan' => 'Kasi Pelayanan',
                    'kadus' => 'Kepala Dusun',
                    default => 'Perangkat Desa',
                },
                'religion' => 'islam',
                'last_education' => 'sma',
                'domicile_status' => 'menetap',
                'current_domicile' => 'Desa Cibenda',
                'is_active' => true,
            ]);

            // ==========================================
            // USER
            // ==========================================

            $user = User::create([
                'village_id' => $village->id,
                'citizen_id' => $citizen->id,
                'name' => $citizen->name,
                'username' => $staff['username'],
                'role' => $staff['role'],
                'email' => $staff['email'],
                'email_verified_at' => now(),
                'password' => Hash::make('Password123'),
                'is_active' => true,
            ]);

            // ==========================================
            // OFFICIAL
            // ==========================================

            Official::create([
                'citizen_id' => $citizen->id,
                'user_id' => $user->id,
                'position' => $staff['position'],
                'village_id' => $village->id,
                'rt_id' => $targetRt->id,
                'rw_id' => $targetRw->id,
                'hamlet_id' => $hamlet->id,
                'started_at' => now()->toDateString(),
                'is_active' => true,
            ]);
        }

        // ==========================================
        // 4. DATA 10 WARGA
        // ==========================================

        $wargaList = [
            [
                'nik' => '3218030101010101',
                'name' => 'Ahmad Hidayat',
                'username' => 'ahmad_hidayat',
                'email' => 'ahmad@example.com',
                'gender' => 'L',
                'rt_key' => 'RT_001_RW_001',
                'rw_key' => 'RW_001',
            ],
            [
                'nik' => '3218030101010102',
                'name' => 'Siti Nurhaliza',
                'username' => 'siti_nurhaliza',
                'email' => 'siti@example.com',
                'gender' => 'P',
                'rt_key' => 'RT_001_RW_001',
                'rw_key' => 'RW_001',
            ],
            [
                'nik' => '3218030101010103',
                'name' => 'Euis Rosmiati',
                'username' => 'euis_rosmiati',
                'email' => 'euis@example.com',
                'gender' => 'P',
                'rt_key' => 'RT_002_RW_001',
                'rw_key' => 'RW_001',
            ],
            [
                'nik' => '3218030101010104',
                'name' => 'Deden Gunawan',
                'username' => 'deden_gunawan',
                'email' => 'dedengunawan@example.com',
                'gender' => 'L',
                'rt_key' => 'RT_002_RW_001',
                'rw_key' => 'RW_001',
            ],
            [
                'nik' => '3218030101010105',
                'name' => 'Nia Kurniasih',
                'username' => 'nia_kurniasih',
                'email' => 'nia@example.com',
                'gender' => 'P',
                'rt_key' => 'RT_001_RW_002',
                'rw_key' => 'RW_002',
            ],
            [
                'nik' => '3218030101010106',
                'name' => 'Toto Sugiarto',
                'username' => 'toto_sugiarto',
                'email' => 'toto@example.com',
                'gender' => 'L',
                'rt_key' => 'RT_001_RW_002',
                'rw_key' => 'RW_002',
            ],
            [
                'nik' => '3218030101010107',
                'name' => 'Cecep Hendra',
                'username' => 'cecep_hendra',
                'email' => 'cecep@example.com',
                'gender' => 'L',
                'rt_key' => 'RT_002_RW_002',
                'rw_key' => 'RW_002',
            ],
            [
                'nik' => '3218030101010108',
                'name' => 'Rina Marlina',
                'username' => 'rina_marlina',
                'email' => 'rina@example.com',
                'gender' => 'P',
                'rt_key' => 'RT_002_RW_002',
                'rw_key' => 'RW_002',
            ],
            [
                'nik' => '3218030101010109',
                'name' => 'Endang Hidayat',
                'username' => 'endang_hidayat',
                'email' => 'endang@example.com',
                'gender' => 'L',
                'rt_key' => 'RT_001_RW_003',
                'rw_key' => 'RW_003',
            ],
            [
                'nik' => '3218030101010110',
                'name' => 'Titing Surtini',
                'username' => 'titing_surtini',
                'email' => 'titing@example.com',
                'gender' => 'P',
                'rt_key' => 'RT_002_RW_003',
                'rw_key' => 'RW_003',
            ],
        ];

        foreach ($wargaList as $w) {
            $targetRt = $rts[$w['rt_key']];
            $targetRw = $rws[$w['rw_key']];

            // ==========================================
            // CITIZEN WARGA
            // ==========================================

            $citizen = Citizen::create([
                'village_id' => $village->id,
                'nik' => $w['nik'],
                'nik_hash' => hash('sha256', $w['nik']),
                'name' => $w['name'],
                'date_of_birth' => '1995-06-15',
                'place_of_birth' => 'Pangandaran',
                'gender' => $w['gender'],
                'address' => 'Desa Cibenda',
                'rt_id' => $targetRt->id,
                'rw_id' => $targetRw->id,
                'hamlet_id' => $targetRw->hamlet_id,
                'no_kk' => $w['nik'],
                'marital_status' => 'kawin',
                'occupation' => 'Karyawan Swasta',
                'religion' => 'islam',
                'last_education' => 'sma',
                'domicile_status' => 'menetap',
                'current_domicile' => 'Desa Cibenda',
                'is_active' => true,
            ]);

            // ==========================================
            // USER WARGA
            // ==========================================

            User::create([
                'village_id' => $village->id,
                'citizen_id' => $citizen->id,
                'name' => $citizen->name,
                'username' => $w['username'],
                'role' => 'warga',
                'email' => $w['email'],
                'email_verified_at' => now(),
                'password' => Hash::make('Password123'),
                'is_active' => true,
            ]);
        }
    }
}