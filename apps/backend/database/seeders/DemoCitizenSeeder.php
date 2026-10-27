<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Citizen;
use App\Models\Family;
use App\Models\Occupation;
use App\Models\Rt;
use App\Models\User;
use App\Models\Village;
use Database\Seeders\Support\DemoData;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

/**
 * 100 warga Desa Cibenda dalam beberapa KK, tersebar acak di semua RT.
 * Kepala keluarga KK pertama (RT 001/RW 001 Dusun Patrol) adalah akun
 * demo_warga; istrinya demo_warga2 dan anak tertuanya demo_warga3 (untuk
 * mencoba saksi/TTD antar-warga dan layanan yang memilih anggota KK).
 */
class DemoCitizenSeeder extends Seeder
{
    public const TOTAL_CITIZENS = 100;

    public const DEMO_USERNAME = 'demo_warga';

    public const DEMO_SPOUSE_USERNAME = 'demo_warga2';

    public const DEMO_CHILD_USERNAME = 'demo_warga3';

    /** Pekerjaan khas desa, di luar tiga pekerjaan bawaan OccupationService. */
    public const OCCUPATIONS = [
        'Petani',
        'Nelayan',
        'Pedagang',
        'Buruh harian lepas',
        'Wiraswasta',
        'Karyawan swasta',
        'Guru',
        'Peternak',
        'Perangkat desa',
    ];

    private const ADULT_JOBS = [
        'Petani', 'Petani', 'Petani', 'Nelayan', 'Nelayan', 'Pedagang',
        'Buruh harian lepas', 'Buruh harian lepas', 'Wiraswasta', 'Karyawan swasta', 'Guru', 'Peternak',
    ];

    private const BIRTH_PLACES = ['Pangandaran', 'Pangandaran', 'Pangandaran', 'Pangandaran', 'Ciamis', 'Tasikmalaya', 'Banjar', 'Bandung'];

    private const ADULT_EDUCATION = ['sd', 'sd', 'smp', 'smp', 'sma', 'sma', 'sma', 'diploma', 's1'];

    private const BLOOD_TYPES = ['A', 'B', 'AB', 'O', 'O', 'tidak_tahu'];

    private const FAMILY_SIZES = [1, 2, 3, 3, 4, 4, 4, 5, 5, 6];

    private Village $village;

    /** @var array<string, int> nama pekerjaan => id */
    private array $occupations = [];

    private int $sequence = 0;

    public function run(): void
    {
        DemoData::start(1001);

        $this->village = Village::query()->where('code', DemoData::VILLAGE_CODE)->firstOrFail();
        $this->seedOccupations();

        $rts = Rt::query()->with('rw.hamlet')->where('village_id', $this->village->id)->orderBy('id')->get();
        // RT pertama adalah RT 001/RW 001 Dusun Patrol (urutan pembuatan DemoVillageSeeder).
        $demoRt = $rts->first();

        $familyNumber = 0;
        while ($this->sequence < self::TOTAL_CITIZENS) {
            $familyNumber++;
            $size = min(DemoData::pick(self::FAMILY_SIZES), self::TOTAL_CITIZENS - $this->sequence);
            $rt = $familyNumber === 1 ? $demoRt : $rts[mt_rand(0, $rts->count() - 1)];

            $head = $this->seedFamily($familyNumber, max($size, $familyNumber === 1 ? 3 : 1), $rt);

            if ($familyNumber === 1) {
                $this->seedDemoAccount(self::DEMO_USERNAME, $head);
                $this->seedFamilyAccounts($head);
            }
        }
    }

    private function seedOccupations(): void
    {
        $sortOrder = Occupation::query()->where('village_id', $this->village->id)->max('sort_order') ?? 0;

        foreach (self::OCCUPATIONS as $name) {
            Occupation::query()->firstOrCreate(
                ['village_id' => $this->village->id, 'name' => $name],
                ['is_active' => true, 'sort_order' => ++$sortOrder],
            );
        }

        $this->occupations = Occupation::query()
            ->where('village_id', $this->village->id)
            ->pluck('id', 'name')
            ->all();
    }

    /**
     * Satu KK: kepala keluarga, pasangan (bila ada), dan anak-anak. Ukuran
     * dibatasi sisa kuota warga.
     */
    private function seedFamily(int $familyNumber, int $size, Rt $rt): Citizen
    {
        $size = min($size, self::TOTAL_CITIZENS - $this->sequence);
        $address = sprintf(
            'Dusun %s RT %s/RW %s, Desa Cibenda',
            $rt->rw->hamlet->name,
            $rt->number,
            $rt->rw->number,
        );

        $noKk = sprintf('%s%s%04d', DemoData::DISTRICT_CODE, '150118', $familyNumber);
        $family = Family::query()->updateOrCreate(
            ['no_kk_hash' => hash('sha256', $noKk)],
            [
                'village_id' => $this->village->id,
                'no_kk' => $noKk,
                'family_address' => $address,
                'family_status' => 'aktif',
                'rt_id' => $rt->id,
                'rw_id' => $rt->rw_id,
                'hamlet_id' => $rt->rw->hamlet_id,
            ],
        );

        $base = [
            'family_id' => $family->id,
            'rt_id' => $rt->id,
            'hamlet_id' => $rt->rw->hamlet_id,
            'address' => $address,
        ];

        // KK satu orang: lajang muda atau lansia yang ditinggal pasangan.
        if ($size === 1) {
            $young = mt_rand(0, 1) === 1;
            $gender = DemoData::pick(['L', 'P']);
            $head = $this->seedCitizen($base + [
                'gender' => $gender,
                'date_of_birth' => $young ? DemoData::birthDate(21, 35) : DemoData::birthDate(60, 78),
                'family_role' => 'kepala_keluarga',
                'marital_status' => $young ? 'belum_kawin' : 'cerai_mati',
            ]);

            return $this->finishFamily($family, $head);
        }

        // Sebagian kecil KK dikepalai ibu tunggal; sisanya pasangan suami-istri.
        $singleMother = mt_rand(1, 10) === 1;
        $head = $this->seedCitizen($base + [
            'gender' => $singleMother ? 'P' : 'L',
            'date_of_birth' => DemoData::birthDate(30, 62),
            'family_role' => 'kepala_keluarga',
            'marital_status' => $singleMother ? 'cerai_mati' : 'kawin',
        ]);

        $father = $singleMother ? null : $head;
        $mother = $singleMother ? $head : null;

        if (! $singleMother) {
            $mother = $this->seedCitizen($base + [
                'gender' => 'P',
                'date_of_birth' => $this->shiftYears($head->date_of_birth->toDateString(), mt_rand(0, 7)),
                'family_role' => 'istri',
                'marital_status' => 'kawin',
            ]);
        }

        $childCount = $size - ($singleMother ? 1 : 2);
        $motherAge = $mother->date_of_birth->age;
        for ($i = 0; $i < $childCount; $i++) {
            $this->seedCitizen($base + [
                'gender' => DemoData::pick(['L', 'P']),
                'date_of_birth' => DemoData::birthDate(0, max(0, min($motherAge - 20, 28))),
                'family_role' => 'anak',
                'marital_status' => 'belum_kawin',
                'father_id' => $father?->id,
                'mother_id' => $mother->id,
                'father_name_text' => $father?->name,
                'mother_name_text' => $mother->name,
            ]);
        }

        return $this->finishFamily($family, $head);
    }

    private function finishFamily(Family $family, Citizen $head): Citizen
    {
        $family->update(['head_of_family_id' => $head->id]);

        return $head;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function seedCitizen(array $attributes): Citizen
    {
        $this->sequence++;
        $gender = $attributes['gender'];
        $nik = DemoData::nik($gender, $attributes['date_of_birth'], $this->sequence);
        $age = now()->diffInYears($attributes['date_of_birth'], true);

        return Citizen::query()->updateOrCreate(
            ['nik_hash' => hash('sha256', $nik)],
            [
                'village_id' => $this->village->id,
                'nik' => $nik,
                'name' => DemoData::uniqueName($gender),
                'place_of_birth' => DemoData::pick(self::BIRTH_PLACES),
                'blood_type' => DemoData::pick(self::BLOOD_TYPES),
                'occupation_id' => $this->occupations[$this->occupationFor((int) $age, $gender, $attributes['family_role'])] ?? null,
                'religion' => mt_rand(1, 50) === 1 ? 'kristen' : 'islam',
                'last_education' => $this->educationFor((int) $age),
                'domicile_status' => 'menetap',
                'current_domicile' => $attributes['address'],
                'residency_type' => mt_rand(1, 10) === 1 ? 'pendatang' : 'lokal',
                'data_source' => 'manual_input_desa',
                'is_active' => true,
            ] + $attributes,
        );
    }

    private function occupationFor(int $age, string $gender, string $role): string
    {
        return match (true) {
            $age < 6 => 'Tidak bekerja',
            $age < 23 => 'Pelajar/Mahasiswa',
            $age >= 68 => 'Tidak bekerja',
            $gender === 'P' && $role === 'istri' && mt_rand(1, 10) <= 7 => 'Ibu rumah tangga',
            default => DemoData::pick(self::ADULT_JOBS),
        };
    }

    private function educationFor(int $age): string
    {
        return match (true) {
            $age < 7 => 'tidak_sekolah',
            $age < 13 => 'sd',
            $age < 16 => 'smp',
            $age < 19 => 'sma',
            default => DemoData::pick(self::ADULT_EDUCATION),
        };
    }

    private function shiftYears(string $date, int $years): string
    {
        return Carbon::parse($date)->addYears($years)->min(now()->subYears(20))->toDateString();
    }

    /**
     * Akun untuk istri dan anak tertua kepala keluarga demo.
     */
    private function seedFamilyAccounts(Citizen $head): void
    {
        $members = Citizen::query()
            ->where('family_id', $head->family_id)
            ->whereKeyNot($head->id)
            ->orderBy('date_of_birth')
            ->get();
        $spouse = $members->first(fn (Citizen $member): bool => $member->family_role?->value === 'istri') ?? $members->first();
        $child = $members->first(fn (Citizen $member): bool => $member->family_role?->value === 'anak' && $member->isNot($spouse));

        if ($spouse !== null) {
            $this->seedDemoAccount(self::DEMO_SPOUSE_USERNAME, $spouse);
        }

        if ($child !== null) {
            $this->seedDemoAccount(self::DEMO_CHILD_USERNAME, $child);
        }
    }

    private function seedDemoAccount(string $username, Citizen $citizen): void
    {
        User::query()->updateOrCreate(
            ['username' => $username],
            [
                'village_id' => $this->village->id,
                'citizen_id' => $citizen->id,
                'name' => $citizen->name,
                'role' => UserRole::Warga->value,
                'email' => null,
                'email_verified_at' => now(),
                'password' => Hash::make(DemoData::DEMO_PASSWORD),
                'must_change_password' => false,
                'is_active' => true,
            ],
        );
    }
}
