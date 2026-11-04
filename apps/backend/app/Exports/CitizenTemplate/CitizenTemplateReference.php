<?php

namespace App\Exports\CitizenTemplate;

use App\Models\Hamlet;
use App\Models\Occupation;
use App\Models\Rt;
use App\Models\Rw;
use Illuminate\Support\Carbon;

/**
 * Data acuan template impor warga untuk satu desa, dibaca dari database
 * setiap kali template diunduh: dusun, RW, RT per RW, dan pekerjaan aktif.
 * Dipakai untuk dropdown sheet Data Warga dan isi sheet Daftar Pilihan.
 */
final class CitizenTemplateReference
{
    /**
     * @param  list<string>  $hamlets  nama dusun
     * @param  list<array{number: string, hamlet: string|null}>  $rws
     * @param  array<string, list<string>>  $rtsByRw  nomor RW => nomor RT
     * @param  list<string>  $occupations  nama pekerjaan aktif
     */
    public function __construct(
        public readonly array $hamlets,
        public readonly array $rws,
        public readonly array $rtsByRw,
        public readonly array $occupations,
        public readonly Carbon $generatedAt,
    ) {}

    public static function forVillage(?string $villageId): self
    {
        if ($villageId === null) {
            return new self([], [], [], [], now());
        }

        $hamlets = Hamlet::query()->where('village_id', $villageId)->orderBy('name')->get(['id', 'name']);
        $hamletNames = $hamlets->pluck('name', 'id');

        $rws = Rw::query()->where('village_id', $villageId)->get(['id', 'number', 'hamlet_id'])
            ->sortBy(fn (Rw $rw) => self::numberKey($rw->number))->values();

        $rts = Rt::query()->where('village_id', $villageId)->get(['rw_id', 'number'])
            ->sortBy(fn (Rt $rt) => self::numberKey($rt->number))
            ->groupBy('rw_id');

        $rtsByRw = [];
        foreach ($rws as $rw) {
            $rtsByRw[$rw->number] = $rts->get($rw->id, collect())->pluck('number')->values()->all();
        }

        return new self(
            hamlets: $hamlets->pluck('name')->values()->all(),
            rws: $rws->map(fn (Rw $rw) => ['number' => $rw->number, 'hamlet' => $hamletNames[$rw->hamlet_id] ?? null])->all(),
            rtsByRw: $rtsByRw,
            occupations: Occupation::query()->where('village_id', $villageId)->where('is_active', true)
                ->orderBy('sort_order')->orderBy('name')->pluck('name')->all(),
            generatedAt: now(),
        );
    }

    /**
     * Nama range Excel untuk daftar RT satu RW, mis. "RW_003". Dropdown RT
     * memakai INDIRECT("RW_"&<sel RW>), jadi harus sama dengan isi sel RW.
     */
    public static function rtRangeName(string $rwNumber): string
    {
        return 'RW_'.preg_replace('/[^A-Za-z0-9]/', '_', $rwNumber);
    }

    /** RW pertama yang punya RT, untuk baris contoh. */
    public function exampleRegion(): ?array
    {
        foreach ($this->rws as $rw) {
            if (($this->rtsByRw[$rw['number']] ?? []) !== []) {
                return ['hamlet' => $rw['hamlet'] ?? '', 'rw' => $rw['number'], 'rt' => $this->rtsByRw[$rw['number']][0]];
            }
        }

        return null;
    }

    /** "2" sebelum "10"; nomor bukan angka di akhir. */
    private static function numberKey(string $number): string
    {
        return is_numeric($number) ? sprintf('%010d', (int) $number) : 'z'.$number;
    }
}
