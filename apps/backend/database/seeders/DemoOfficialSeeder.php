<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\OfficialPosition;
use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Occupation;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Database\Seeders\Support\DemoData;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;

/**
 * Perangkat Desa Cibenda dari desacibenda.id/perangkat-desa (lengkap dengan
 * foto), Ketua RW dan RT dengan nama acak tanpa foto, serta Staf SIDUTama
 * demo. Setiap jabatan yang punya peran di aplikasi mendapat akun dengan
 * password demo, supaya alur surat RT -> Kepala Desa bisa dicoba dari RT
 * mana pun.
 *
 * Akun demo melekat ke jabatan nyata: demo_kadus adalah Kadus Patrol,
 * demo_rw Ketua RW 001 Patrol, demo_rt Ketua RT 001/RW 001 Patrol.
 */
class DemoOfficialSeeder extends Seeder
{
    /** Awal nomor urut NIK, terpisah dari warga di DemoCitizenSeeder. */
    private const NIK_SEQUENCE_START = 5000;

    private const STARTED_AT = '2022-08-01';

    /**
     * @var array<int, array{name: string, gender: string, position: string, photo: string, username?: string, hamlet?: int}>
     */
    private const VILLAGE_OFFICIALS = [
        ['name' => 'Dede Rusliana', 'gender' => 'L', 'position' => 'kepala_desa', 'photo' => 'dede-rusliana', 'username' => 'dede.rusliana'],
        ['name' => 'Saeful Millah', 'gender' => 'L', 'position' => 'sekretaris_desa', 'photo' => 'saeful-millah', 'username' => 'saeful.millah'],
        ['name' => 'Sakim Hidayat', 'gender' => 'L', 'position' => 'kasi_pemerintahan', 'photo' => 'sakim-hidayat', 'username' => 'sakim.hidayat'],
        ['name' => 'Wahyu Munazat, S.Pd, M.Pd', 'gender' => 'L', 'position' => 'kasi_kesejahteraan', 'photo' => 'wahyu-munazat'],
        ['name' => 'Ferdiansyah', 'gender' => 'L', 'position' => 'kasi_pelayanan', 'photo' => 'ferdiansyah'],
        ['name' => 'Peri Priatna', 'gender' => 'L', 'position' => 'kaur_perencanaan', 'photo' => 'peri-priatna'],
        ['name' => 'Ratini, S.Pd', 'gender' => 'P', 'position' => 'kaur_keuangan', 'photo' => 'ratini'],
        ['name' => 'Tita Sutiasih, S.IP.', 'gender' => 'P', 'position' => 'kaur_tu_umum', 'photo' => 'tita-sutiasih', 'username' => 'tita.sutiasih'],
        ['name' => 'Cici Suprianti', 'gender' => 'P', 'position' => 'staf_siskeudes', 'photo' => 'cici-suprianti'],
        ['name' => 'Rini Noviani', 'gender' => 'P', 'position' => 'staf_sipades', 'photo' => 'rini-noviani'],
        ['name' => 'Aditulloh', 'gender' => 'L', 'position' => 'kadus', 'photo' => 'aditulloh', 'username' => 'demo_kadus', 'hamlet' => 1],
        ['name' => 'Dede Suharna', 'gender' => 'L', 'position' => 'kadus', 'photo' => 'dede-suharna', 'username' => 'kadus.sinargalih', 'hamlet' => 2],
        ['name' => 'Ade Kusli', 'gender' => 'L', 'position' => 'kadus', 'photo' => 'ade-kusli', 'username' => 'kadus.cibenda', 'hamlet' => 3],
        ['name' => 'Ekon', 'gender' => 'L', 'position' => 'kadus', 'photo' => 'ekon', 'username' => 'kadus.budiasih', 'hamlet' => 4],
        ['name' => 'Suherli', 'gender' => 'L', 'position' => 'kadus', 'photo' => 'suherli', 'username' => 'kadus.sucen', 'hamlet' => 5],
    ];

    private const PETUGAS_USERNAME = 'demo_admin';

    private const CHAIR_JOBS = ['Petani', 'Petani', 'Nelayan', 'Pedagang', 'Wiraswasta', 'Guru', 'Karyawan swasta'];

    private Village $village;

    /** @var array<string, int> nama pekerjaan => id */
    private array $occupations = [];

    private string $passwordHash;

    private int $sequence = self::NIK_SEQUENCE_START;

    public function run(): void
    {
        DemoData::start(2002);

        $this->village = Village::query()->where('code', DemoData::VILLAGE_CODE)->firstOrFail();
        $this->occupations = Occupation::query()->where('village_id', $this->village->id)->pluck('id', 'name')->all();
        // Satu kali bcrypt untuk ±160 akun; hasil hash dipakai ulang.
        $this->passwordHash = Hash::make(DemoData::DEMO_PASSWORD);

        $hamlets = Hamlet::query()
            ->where('village_id', $this->village->id)
            ->with(['rws' => fn ($query) => $query->orderBy('number')->with(['rts' => fn ($query) => $query->orderBy('number')])])
            ->orderBy('code')
            ->get()
            ->keyBy(fn (Hamlet $hamlet) => (int) substr($hamlet->code, -2));

        foreach (DemoData::HAMLETS as $name) {
            DemoData::reserveName($name);
        }

        $this->seedVillageOfficials($hamlets);
        $this->seedStafSid($hamlets[1]);
        $this->seedNeighbourhoodChairs($hamlets);
    }

    private function seedVillageOfficials(Collection $hamlets): void
    {
        foreach (self::VILLAGE_OFFICIALS as $person) {
            $hamlet = isset($person['hamlet']) ? $hamlets[$person['hamlet']] : $hamlets[mt_rand(1, 5)];
            $rws = $hamlet->rws;
            $rw = $rws[mt_rand(0, $rws->count() - 1)];
            $rt = $rw->rts[mt_rand(0, $rw->rts->count() - 1)];

            $citizen = $this->seedCitizen($person['name'], $person['gender'], $hamlet, $rw, $rt, 'Perangkat desa', 35, 58);
            $user = isset($person['username'])
                ? $this->seedUser($person['username'], $citizen, OfficialPosition::from($person['position']))
                : null;

            $this->seedOfficial($citizen, $user, $person['position'], [
                'hamlet_id' => $person['position'] === 'kadus' ? $hamlet->id : null,
                'photo_img' => DemoData::publishAsset(
                    "officials/{$person['photo']}.webp",
                    "official-photos/{$this->village->id}",
                ),
            ]);
        }
    }

    private function seedStafSid(Hamlet $hamlet): void
    {
        $rw = $hamlet->rws->first();
        $citizen = $this->seedCitizen('Admin Desa Demo', 'L', $hamlet, $rw, $rw->rts->first(), 'Perangkat desa', 25, 35);
        $user = $this->seedUser(self::PETUGAS_USERNAME, $citizen, OfficialPosition::StafSid);
        $this->seedOfficial($citizen, $user, OfficialPosition::StafSid->value, []);
    }

    /**
     * Ketua RW dan RT tiap dusun. Username rw.<dusun>.<nn> dan
     * rt.<dusun>.<nn>.<nn>, kecuali RW/RT pertama Dusun Patrol yang menjadi
     * akun demo.
     */
    private function seedNeighbourhoodChairs(Collection $hamlets): void
    {
        foreach ($hamlets as $hamletNumber => $hamlet) {
            $slug = strtolower(DemoData::HAMLETS[$hamletNumber]);

            foreach ($hamlet->rws as $rw) {
                $rwNumber = substr($rw->number, -2);
                $firstRw = $hamletNumber === 1 && $rw->number === '001';
                $rwHomeRt = $rw->rts[mt_rand(0, $rw->rts->count() - 1)];

                $citizen = $this->seedCitizen(null, $this->chairGender(), $hamlet, $rw, $rwHomeRt, DemoData::pick(self::CHAIR_JOBS), 38, 65);
                $user = $this->seedUser($firstRw ? 'demo_rw' : "rw.{$slug}.{$rwNumber}", $citizen, OfficialPosition::Rw);
                $this->seedOfficial($citizen, $user, OfficialPosition::Rw->value, [
                    'rw_id' => $rw->id,
                    'hamlet_id' => $hamlet->id,
                ]);

                foreach ($rw->rts as $rt) {
                    $rtNumber = substr($rt->number, -2);
                    $firstRt = $firstRw && $rt->number === '001';

                    $citizen = $this->seedCitizen(null, $this->chairGender(), $hamlet, $rw, $rt, DemoData::pick(self::CHAIR_JOBS), 30, 60);
                    $user = $this->seedUser($firstRt ? 'demo_rt' : "rt.{$slug}.{$rwNumber}.{$rtNumber}", $citizen, OfficialPosition::Rt);
                    $this->seedOfficial($citizen, $user, OfficialPosition::Rt->value, [
                        'rt_id' => $rt->id,
                        'rw_id' => $rw->id,
                        'hamlet_id' => $hamlet->id,
                    ]);
                }
            }
        }
    }

    private function chairGender(): string
    {
        return mt_rand(1, 5) === 1 ? 'P' : 'L';
    }

    private function seedCitizen(?string $name, string $gender, Hamlet $hamlet, Rw $rw, Rt $rt, string $occupation, int $minAge, int $maxAge): Citizen
    {
        $this->sequence++;
        $dateOfBirth = DemoData::birthDate($minAge, $maxAge);
        $nik = DemoData::nik($gender, $dateOfBirth, $this->sequence);
        $address = sprintf('Dusun %s RT %s/RW %s, Desa Cibenda', $hamlet->name, $rt->number, $rw->number);

        if ($name !== null) {
            DemoData::reserveName($name);
        }

        return Citizen::query()->updateOrCreate(
            ['nik_hash' => hash('sha256', $nik)],
            [
                'village_id' => $this->village->id,
                'nik' => $nik,
                'name' => $name ?? DemoData::uniqueName($gender),
                'date_of_birth' => $dateOfBirth,
                'place_of_birth' => 'Pangandaran',
                'gender' => $gender,
                'blood_type' => DemoData::pick(['A', 'B', 'AB', 'O']),
                'address' => $address,
                'rt_id' => $rt->id,
                'hamlet_id' => $hamlet->id,
                'marital_status' => 'kawin',
                'occupation_id' => $this->occupations[$occupation] ?? null,
                'religion' => 'islam',
                'last_education' => DemoData::pick(['sma', 'sma', 'diploma', 's1']),
                'domicile_status' => 'menetap',
                'current_domicile' => $address,
                'residency_type' => 'lokal',
                'data_source' => 'manual_input_desa',
                'is_active' => true,
            ],
        );
    }

    private function seedUser(string $username, Citizen $citizen, OfficialPosition $position): User
    {
        return User::query()->updateOrCreate(
            ['username' => $username],
            [
                'village_id' => $this->village->id,
                'citizen_id' => $citizen->id,
                'name' => $citizen->name,
                'role' => $position->userRole()->value,
                'email' => null,
                'email_verified_at' => now(),
                'password' => $this->passwordHash,
                'must_change_password' => false,
                'is_active' => true,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function seedOfficial(Citizen $citizen, ?User $user, string $position, array $attributes): void
    {
        Official::query()->updateOrCreate(
            ['citizen_id' => $citizen->id, 'position' => $position],
            $attributes + [
                'user_id' => $user?->id,
                'village_id' => $this->village->id,
                'rt_id' => null,
                'rw_id' => null,
                'hamlet_id' => null,
                'started_at' => self::STARTED_AT,
                'is_active' => true,
            ],
        );
    }
}
