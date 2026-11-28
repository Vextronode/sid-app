<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use App\Support\AreaNumber;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Pemasangan desa pada instalasi baru (sid:install): desa, data acuan desa,
 * wilayah awal Staf SIDUTama (opsional), dan akun Staf SIDUTama pertama.
 * SID melayani satu desa per instalasi, jadi pemasangan ditolak bila desa
 * sudah ada. Semua langkah berada dalam satu transaksi.
 */
class VillageInstallService
{
    public function __construct(
        private readonly OfficialAssignmentService $assignmentService,
    ) {}

    /**
     * @param  array{name?: ?string, code?: ?string, head_name?: ?string, district?: ?string, regency?: ?string, province?: ?string, postal_code?: ?string}  $village
     * @param  array{hamlet?: ?string, rw?: mixed, rt?: mixed}  $area  kosong semua = tanpa wilayah
     * @param  array{nik?: ?string, name?: ?string, date_of_birth?: ?string, gender?: ?string, address?: ?string}  $staff
     * @return array{village: Village, rt: ?Rt, user: User, temporary_password: string}
     *
     * @throws ValidationException data tidak valid
     * @throws RuntimeException desa sudah terpasang
     */
    public function install(array $village, array $area, array $staff): array
    {
        $this->ensureNotInstalled();

        $village = $this->validateVillage($village);
        $area = $this->validateArea($area);
        $staff = $this->validateStaff($staff);

        return DB::transaction(function () use ($village, $area, $staff): array {
            $this->ensureNotInstalled();

            $created = Village::query()->create($village);
            $rt = $area !== null ? $this->createArea($created, $area) : null;

            // Data acuan (jenis surat, alur persetujuan, pekerjaan, dsb.) untuk
            // desa yang baru dibuat; seeder yang sama dipakai data demo.
            app(ReferenceDataSeeder::class)->setContainer(app())->__invoke();

            $result = $this->assignmentService->bootstrapFirstPetugas([
                ...$staff,
                'village_id' => $created->id,
                'rt_id' => $rt?->id,
            ]);

            return [
                'village' => $created->fresh(),
                'rt' => $rt,
                'user' => $result['user'],
                'temporary_password' => $result['temporary_password'],
            ];
        });
    }

    private function ensureNotInstalled(): void
    {
        if (Village::query()->exists()) {
            throw new RuntimeException('Desa sudah terpasang. SID melayani satu desa per instalasi; ubah identitas desa dari Kelola Profil Desa.');
        }
    }

    private function validateVillage(array $data): array
    {
        return Validator::make($data, [
            'name' => ['required', 'string', 'max:100'],
            // Kode wilayah desa Kemendagri, 10 digit tanpa titik.
            'code' => ['required', 'digits:10', Rule::unique('villages', 'code')],
            'head_name' => ['nullable', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'max:100'],
            'regency' => ['nullable', 'string', 'max:100'],
            'province' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:10'],
        ], [
            'code.digits' => 'Kode desa harus 10 digit angka (kode wilayah Kemendagri tanpa titik).',
        ], [
            'name' => 'nama desa',
            'code' => 'kode desa',
        ])->validate();
    }

    /**
     * @return array{hamlet: string, rw: string, rt: string}|null
     */
    private function validateArea(array $data): ?array
    {
        $data = array_map(fn ($value) => filled($value) ? $value : null, [
            'hamlet' => $data['hamlet'] ?? null,
            'rw' => AreaNumber::normalize($data['rw'] ?? null),
            'rt' => AreaNumber::normalize($data['rt'] ?? null),
        ]);

        if (array_filter($data, fn ($value) => $value !== null) === []) {
            return null;
        }

        return Validator::make($data, [
            'hamlet' => ['required', 'string', 'max:255'],
            'rw' => ['required', 'string', AreaNumber::RULE],
            'rt' => ['required', 'string', AreaNumber::RULE],
        ], [
            'required' => 'Opsi --dusun, --rw, dan --rt harus diisi bersama.',
            'rw.regex' => 'Nomor RW harus angka 1 sampai 999.',
            'rt.regex' => 'Nomor RT harus angka 1 sampai 999.',
        ])->validate();
    }

    private function validateStaff(array $data): array
    {
        return Validator::make($data, [
            'nik' => ['required', 'digits:16'],
            'name' => ['required', 'string', 'max:100'],
            'date_of_birth' => ['required', 'date_format:Y-m-d', 'before:today'],
            'gender' => ['required', Rule::in(['L', 'P'])],
            'address' => ['required', 'string'],
        ], [
            'gender.in' => 'Jenis kelamin harus L atau P.',
        ], [
            'nik' => 'NIK',
            'name' => 'nama staf',
            'date_of_birth' => 'tanggal lahir',
            'gender' => 'jenis kelamin',
            'address' => 'alamat',
        ])->validate();
    }

    /**
     * Satu dusun, RW, dan RT untuk Staf SIDUTama. Kode dusun mengikuti kode
     * desa + nomor urut dua digit; wilayah lain dibuat dari Kelola Wilayah.
     *
     * @param  array{hamlet: string, rw: string, rt: string}  $area
     */
    private function createArea(Village $village, array $area): Rt
    {
        $hamlet = Hamlet::query()->create([
            'village_id' => $village->id,
            'code' => $village->code.'01',
            'name' => $area['hamlet'],
            'is_active' => true,
        ]);

        $rw = Rw::query()->create([
            'village_id' => $village->id,
            'hamlet_id' => $hamlet->id,
            'number' => $area['rw'],
            'is_active' => true,
        ]);

        return Rt::query()->create([
            'village_id' => $village->id,
            'rw_id' => $rw->id,
            'number' => $area['rt'],
            'is_active' => true,
        ]);
    }
}
