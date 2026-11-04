<?php

namespace App\Imports\Support;

use App\Models\Citizen;
use BackedEnum;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * SHDK warga impor yang file-nya tidak punya kolom SHDK (file data pemilih
 * KPU), ditebak per KK dari jenis kelamin, status kawin, dan umur:
 * - laki-laki tertua berstatus kawin -> kepala_keluarga;
 * - perempuan tertua berstatus kawin -> istri;
 * - belum kawin -> anak;
 * - anggota kawin lainnya (bukan tertua) dan pernah kawin -> dikosongkan.
 * KK tanpa laki-laki kawin (janda/duda, lajang sendiri): anggota tertua
 * menjadi kepala_keluarga, supaya KK tetap punya kepala.
 *
 * Hanya warga yang baru diimpor dengan SHDK kosong yang diubah; kepala
 * keluarga tidak ditebak bila KK sudah punya kepala aktif. Petugas tinggal
 * mengoreksi tebakan yang salah lewat Data Penduduk.
 */
final class CitizenImportFamilyRoles
{
    /**
     * @param  array<string, list<string>>  $membersByFamily  family_id => id warga impor
     */
    public static function assign(array $membersByFamily): void
    {
        foreach ($membersByFamily as $familyId => $citizenIds) {
            $members = Citizen::query()
                ->whereIn('id', $citizenIds)
                ->whereNull('family_role')
                ->get();

            if ($members->isEmpty()) {
                continue;
            }

            $hasHead = Citizen::query()
                ->where('family_id', $familyId)
                ->where('family_role', 'kepala_keluarga')
                ->where('is_active', true)
                ->exists();

            DB::transaction(function () use ($members, $hasHead) {
                foreach (self::roles($members, $hasHead) as $id => $role) {
                    // save() lewat model supaya Log Aktivitas mencatat perubahan.
                    $members->find($id)?->update(['family_role' => $role]);
                }
            });
        }
    }

    /**
     * @param  Collection<int, Citizen>  $members
     * @return array<string, string> id warga => SHDK
     */
    private static function roles(Collection $members, bool $hasHead): array
    {
        // Tertua dulu; urutan impor sebagai pemecah seri.
        $oldestFirst = $members->sortBy(fn (Citizen $c) => $c->date_of_birth?->toDateString() ?? '9999-12-31')->values();
        $married = fn (Citizen $c) => self::value($c->marital_status) === 'kawin';

        $roles = [];

        if (! $hasHead) {
            $head = $oldestFirst->first(fn (Citizen $c) => $c->gender === 'L' && $married($c)) ?? $oldestFirst->first();
            $roles[$head->id] = 'kepala_keluarga';
        }

        $wife = $oldestFirst->first(fn (Citizen $c) => $c->gender === 'P' && $married($c) && ! isset($roles[$c->id]));
        if ($wife !== null) {
            $roles[$wife->id] = 'istri';
        }

        foreach ($oldestFirst as $member) {
            if (! isset($roles[$member->id]) && self::value($member->marital_status) === 'belum_kawin') {
                $roles[$member->id] = 'anak';
            }
        }

        return $roles;
    }

    private static function value(mixed $value): ?string
    {
        return $value instanceof BackedEnum ? (string) $value->value : $value;
    }
}
