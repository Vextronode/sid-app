<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\OfficialPosition;
use App\Enums\UserRole;
use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class DemoAccountSeeder extends Seeder
{
    public const DEMO_PASSWORD = 'Password123!';

    private const VILLAGE_CODE = '3218032001';

    /**
     * @var array<int, array{role: UserRole, username: string, name: string, position: ?OfficialPosition, scope: string}>
     */
    private const ACCOUNTS = [
        [
            'role' => UserRole::Warga,
            'username' => 'demo_warga',
            'name' => 'Warga Demo',
            'position' => null,
            'scope' => 'rt',
        ],
        [
            'role' => UserRole::Rt,
            'username' => 'demo_rt',
            'name' => 'Ketua RT Demo',
            'position' => OfficialPosition::Rt,
            'scope' => 'rt',
        ],
        [
            'role' => UserRole::Rw,
            'username' => 'demo_rw',
            'name' => 'Ketua RW Demo',
            'position' => OfficialPosition::Rw,
            'scope' => 'rw',
        ],
        [
            'role' => UserRole::Kadus,
            'username' => 'demo_kadus',
            'name' => 'Kepala Dusun Demo',
            'position' => OfficialPosition::Kadus,
            'scope' => 'hamlet',
        ],
        [
            'role' => UserRole::KasiPelayanan,
            'username' => 'demo_kasi',
            'name' => 'Kasi Pelayanan Demo',
            'position' => OfficialPosition::KasiPelayanan,
            'scope' => 'village',
        ],
        [
            'role' => UserRole::KaurTuUmum,
            'username' => 'demo_kaur',
            'name' => 'Kaur TU Umum Demo',
            'position' => OfficialPosition::KaurTuUmum,
            'scope' => 'village',
        ],
        [
            'role' => UserRole::PetugasDesa,
            'username' => 'demo_admin',
            'name' => 'Admin Desa Demo',
            'position' => OfficialPosition::PetugasDesa,
            'scope' => 'village',
        ],
        [
            'role' => UserRole::KepalaDesa,
            'username' => 'demo_kades',
            'name' => 'Kepala Desa Demo',
            'position' => OfficialPosition::KepalaDesa,
            'scope' => 'village',
        ],
        [
            'role' => UserRole::SekretarisDesa,
            'username' => 'demo_sekdes',
            'name' => 'Sekretaris Desa Demo',
            'position' => OfficialPosition::Sekdes,
            'scope' => 'village',
        ],
    ];

    public function run(): void
    {
        $this->ensureNotProduction();

        $village = Village::query()->where('code', self::VILLAGE_CODE)->firstOrFail();
        $hamlet = Hamlet::query()
            ->where('village_id', $village->id)
            ->where('code', self::VILLAGE_CODE.'01')
            ->firstOrFail();
        $rw = Rw::query()
            ->where('hamlet_id', $hamlet->id)
            ->where('number', '001')
            ->firstOrFail();
        $rt = Rt::query()
            ->where('rw_id', $rw->id)
            ->where('number', '001')
            ->firstOrFail();

        foreach (self::ACCOUNTS as $index => $account) {
            $nik = sprintf('320000000000%04d', $index + 1);
            $citizen = Citizen::query()->updateOrCreate(
                ['nik_hash' => hash('sha256', $nik)],
                [
                    'village_id' => $village->id,
                    'nik' => $nik,
                    'name' => $account['name'],
                    'date_of_birth' => sprintf('198%d-01-01', $index % 10),
                    'place_of_birth' => 'Pangandaran',
                    'gender' => $index % 2 === 0 ? 'L' : 'P',
                    'address' => 'Desa Cibenda',
                    'rt_id' => $rt->id,
                    'hamlet_id' => $hamlet->id,
                    'marital_status' => 'belum_kawin',
                    'occupation' => $account['position']?->label() ?? 'Warga',
                    'religion' => 'islam',
                    'last_education' => 'sma',
                    'domicile_status' => 'menetap',
                    'current_domicile' => 'Desa Cibenda',
                    'is_active' => true,
                ],
            );

            $user = User::query()->updateOrCreate(
                ['username' => $account['username']],
                [
                    'village_id' => $village->id,
                    'citizen_id' => $citizen->id,
                    'name' => $account['name'],
                    'role' => $account['role']->value,
                    'email' => null,
                    'email_verified_at' => now(),
                    'password' => Hash::make(self::DEMO_PASSWORD),
                    'must_change_password' => false,
                    'is_active' => true,
                ],
            );

            if ($account['position'] === null) {
                continue;
            }

            Official::query()->updateOrCreate(
                [
                    'citizen_id' => $citizen->id,
                    'position' => $account['position']->value,
                ],
                [
                    'user_id' => $user->id,
                    'village_id' => $village->id,
                    'rt_id' => $account['scope'] === 'rt' ? $rt->id : null,
                    'rw_id' => in_array($account['scope'], ['rt', 'rw'], true) ? $rw->id : null,
                    'hamlet_id' => in_array($account['scope'], ['rt', 'rw', 'hamlet'], true) ? $hamlet->id : null,
                    'started_at' => today(),
                    'is_active' => true,
                ],
            );
        }
    }

    private function ensureNotProduction(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('Demo seeders must not be run in production.');
        }
    }
}
