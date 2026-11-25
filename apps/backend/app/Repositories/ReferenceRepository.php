<?php

namespace App\Repositories;

use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use Illuminate\Support\Facades\DB;

/**
 * Cek "masih dipakai" sebelum menghapus warga atau wilayah.
 *
 * Membaca kolom foreign key yang sama dengan yang dikunci database
 * (ON DELETE NO ACTION), jadi yang ditolak di sini sama dengan yang akan
 * ditolak database, hanya saja dengan pesan yang jelas. Tabel dibaca lewat
 * DB::table supaya semua baris ikut terhitung, sama seperti foreign key.
 * ReferenceRepositoryTest memastikan daftar ini tidak tertinggal dari schema.
 */
class ReferenceRepository
{
    /** @var array<string, array{0: string, 1: list<string>}> label => [tabel, kolom FK ke warga] */
    public const CITIZEN_REFERENCES = [
        'akun login' => ['users', ['citizen_id']],
        'jabatan pejabat' => ['officials', ['citizen_id']],
        'pendaftaran akun' => ['account_registrations', ['citizen_id']],
        'surat' => ['letters', ['citizen_id', 'on_behalf_of']],
        'data usaha' => ['citizen_businesses', ['citizen_id']],
        'data CPMI' => ['migrant_workers', ['citizen_id']],
        'anggota lembaga desa' => ['village_org_members', ['citizen_id']],
        'permintaan foto profil' => ['profile_photo_requests', ['citizen_id']],
    ];

    /** @var array<string, array{0: string, 1: list<string>}> label => [tabel, kolom FK ke wilayah] */
    public const REGION_REFERENCES = [
        'warga' => ['citizens', ['rt_id', 'hamlet_id']],
        'KK' => ['families', ['rt_id', 'rw_id', 'hamlet_id']],
        'pejabat' => ['officials', ['rt_id', 'rw_id', 'hamlet_id']],
        'surat' => ['letters', ['rt_id', 'rw_id', 'hamlet_id']],
        'pendaftaran akun' => ['account_registrations', ['rt_id', 'rw_id', 'hamlet_id']],
        'permintaan foto profil' => ['profile_photo_requests', ['rt_id', 'rw_id', 'hamlet_id']],
    ];

    /**
     * Data yang masih merujuk warga ini (riwayatnya). Hubungan ayah/ibu
     * tidak termasuk: itu data, dan dikosongkan bila warganya dihapus.
     *
     * @return list<string>
     */
    public function citizenUsedBy(Citizen $citizen): array
    {
        return $this->usedBy(self::CITIZEN_REFERENCES, [
            'citizen_id' => [$citizen->id],
            'on_behalf_of' => [$citizen->id],
        ]);
    }

    /**
     * Data yang masih memakai wilayah ini, termasuk RW dan RT di bawahnya
     * yang ikut terhapus lewat cascade (Dusun -> RW -> RT).
     *
     * @return list<string>
     */
    public function regionUsedBy(Hamlet|Rw|Rt $region): array
    {
        $hamletIds = $region instanceof Hamlet ? [$region->id] : [];
        $rwIds = match (true) {
            $region instanceof Hamlet => Rw::query()->where('hamlet_id', $region->id)->pluck('id')->all(),
            $region instanceof Rw => [$region->id],
            default => [],
        };
        $rtIds = $region instanceof Rt
            ? [$region->id]
            : ($rwIds === [] ? [] : Rt::query()->whereIn('rw_id', $rwIds)->pluck('id')->all());

        return $this->usedBy(self::REGION_REFERENCES, [
            'hamlet_id' => $hamletIds,
            'rw_id' => $rwIds,
            'rt_id' => $rtIds,
        ]);
    }

    /**
     * @param  array<string, array{0: string, 1: list<string>}>  $references
     * @param  array<string, list<int|string>>  $idsByColumn  kolom FK => id yang akan terhapus
     * @return list<string>
     */
    private function usedBy(array $references, array $idsByColumn): array
    {
        $usedBy = [];

        foreach ($references as $label => [$table, $columns]) {
            // Kolom tanpa id dilewati; tanpa satu pun kondisi, query akan
            // mencocokkan seluruh tabel.
            $conditions = array_filter(array_intersect_key($idsByColumn, array_flip($columns)));

            if ($conditions === []) {
                continue;
            }

            $isUsed = DB::table($table)
                ->where(function ($query) use ($conditions) {
                    foreach ($conditions as $column => $ids) {
                        $query->orWhereIn($column, $ids);
                    }
                })
                ->exists();

            if ($isUsed) {
                $usedBy[] = $label;
            }
        }

        return $usedBy;
    }
}
