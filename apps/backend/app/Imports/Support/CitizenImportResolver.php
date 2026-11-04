<?php

namespace App\Imports\Support;

use App\Models\Hamlet;
use App\Models\Occupation;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Repositories\FamilyRepository;
use App\Services\FamilyService;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Menurunkan wilayah dan KK warga impor dari kolom file desa:
 * - RW dicari dari nomornya di seluruh desa (penomoran RW tidak mulai lagi
 *   di tiap dusun), lalu RT dicari di dalam RW itu. "001" sama dengan "1".
 * - Kolom RT/RW gabungan ("001/003") dipecah menjadi RT dan RW.
 * - Dusun diambil dari kolom DUSUN bila ada; kalau tidak, dari nama dusun
 *   di ALAMAT; bila ALAMAT tidak menyebut dusun (mis. nama perumahan), ikut
 *   dusun milik RW.
 * - NKK dipakai untuk menautkan ke KK yang ada atau membuat KK baru.
 *
 * Data wilayah dimuat sekali per impor.
 */
final class CitizenImportResolver
{
    /** @var Collection<int, Collection<int, Rw>>|null nomor RW (int) => RW */
    private ?Collection $rws = null;

    /** @var Collection<string, Rt>|null "rw_id:nomor RT" => RT */
    private ?Collection $rts = null;

    /** @var array<string, string>|null id dusun => nama dusun ringkas (huruf saja) */
    private ?array $hamlets = null;

    /** @var array<string, Occupation>|null nama pekerjaan ternormalisasi => pekerjaan */
    private ?array $occupations = null;

    public function __construct(
        private readonly User $user,
        private readonly FamilyService $familyService,
        private readonly FamilyRepository $familyRepository,
    ) {}

    /**
     * Isi rt_id, rw_id, dan hamlet_id dari kolom rt/rw/rt_rw/hamlet/address.
     * Baris yang sudah membawa rt_id (template sistem) tidak dicari lagi;
     * hamlet_id yang sudah diisi tidak ditimpa.
     *
     * @param  array<string, mixed>  $data
     * @param  list<string>  $warnings  nama dusun yang tidak ditemukan
     * @return array<string, mixed>
     *
     * @throws ValidationException RW/RT tidak ditemukan
     */
    public function region(array $data, array &$warnings = []): array
    {
        if (isset($data['rt_rw']) && ! isset($data['rt']) && ! isset($data['rw'])) {
            // "001/003", "1-3", "001 003": RT lalu RW.
            $numbers = preg_split('/\D+/', (string) $data['rt_rw'], -1, PREG_SPLIT_NO_EMPTY);
            if (count($numbers) === 2) {
                [$data['rt'], $data['rw']] = $numbers;
            }
        }

        if (isset($data['hamlet'])) {
            $data['hamlet_id'] ??= $this->hamletByName((string) $data['hamlet'], $warnings);
        }

        unset($data['rt_rw'], $data['hamlet']);

        // Template sistem memakai rt_id langsung; jalur ini untuk file desa.
        if (isset($data['rt_id']) || (! isset($data['rw']) && ! isset($data['rt']))) {
            return $data;
        }

        $rw = $this->findRw($data['rw'] ?? null);
        $data['rt_id'] = $this->findRt($rw, $data['rt'] ?? null)->id;
        $data['rw_id'] = $rw->id;
        $data['hamlet_id'] ??= $this->hamletFromAddress((string) ($data['address'] ?? ''), $rw->hamlet_id)
            ?? $rw->hamlet_id;

        return $data;
    }

    /**
     * Isi occupation_id dari kolom pekerjaan. Nama dicocokkan persis ke
     * Katalog Pekerjaan desa (huruf besar/kecil dan tanda baca diabaikan),
     * tanpa menebak yang mirip: "Tani" tidak dipasang ke "Petani". Tidak
     * ditemukan atau nonaktif -> dikosongkan dengan peringatan.
     *
     * @param  array<string, mixed>  $data
     * @param  list<string>  $warnings
     * @return array<string, mixed>
     */
    public function occupation(array $data, array &$warnings = []): array
    {
        $name = $data['occupation'] ?? null;
        unset($data['occupation']);

        if ($name === null || isset($data['occupation_id'])) {
            return $data;
        }

        $this->occupations ??= Occupation::query()
            ->where('village_id', $this->user->village_id)
            ->get()
            ->keyBy(fn (Occupation $occupation) => self::occupationKey($occupation->name))
            ->all();

        $occupation = $this->occupations[self::occupationKey((string) $name)] ?? null;

        if ($occupation === null) {
            $warnings[] = "Pekerjaan \"{$name}\" tidak ada di Katalog Pekerjaan; kolom ini dikosongkan.";
        } elseif (! $occupation->is_active) {
            $warnings[] = "Pekerjaan \"{$name}\" nonaktif di Katalog Pekerjaan; kolom ini dikosongkan.";
        } else {
            $data['occupation_id'] = $occupation->id;
        }

        return $data;
    }

    /**
     * ID KK untuk No KK ini; KK baru dibuat dengan alamat & wilayah warga
     * pertama yang memakainya. Dipanggil di dalam transaksi baris supaya KK
     * ikut batal bila warganya gagal disimpan.
     *
     * @param  array<string, mixed>  $data
     */
    public function familyId(string $noKk, array $data): string
    {
        $family = $this->familyRepository->findByNoKkHash(hash('sha256', $noKk));

        if ($family !== null) {
            if ($family->village_id !== $this->user->village_id) {
                throw ValidationException::withMessages(['no_kk' => ['No KK terdaftar di desa lain.']]);
            }

            return $family->id;
        }

        $rwId = $data['rw_id'] ?? (isset($data['rt_id']) ? Rt::query()->whereKey($data['rt_id'])->value('rw_id') : null);

        return $this->familyService->create([
            'no_kk' => $noKk,
            'family_address' => $data['address'],
            'rt_id' => $data['rt_id'] ?? null,
            'rw_id' => $rwId,
            'hamlet_id' => $data['hamlet_id'] ?? null,
        ], $this->user)->id;
    }

    private function findRw(mixed $number): Rw
    {
        $this->rws ??= Rw::query()
            ->where('village_id', $this->user->village_id)
            ->get()
            ->groupBy(fn (Rw $rw) => self::number($rw->number));

        $matches = self::isNumber($number) ? $this->rws->get(self::number($number), collect()) : collect();

        if ($matches->count() !== 1) {
            throw ValidationException::withMessages(['rw' => [$matches->isEmpty()
                ? "RW {$number} tidak ditemukan di data wilayah desa."
                : "RW {$number} ada di lebih dari satu dusun; isi kolom rt_id."]]);
        }

        return $matches->first();
    }

    private function findRt(Rw $rw, mixed $number): Rt
    {
        $this->rts ??= Rt::query()
            ->where('village_id', $this->user->village_id)
            ->get()
            ->keyBy(fn (Rt $rt) => $rt->rw_id.':'.self::number($rt->number));

        $rt = self::isNumber($number) ? $this->rts->get($rw->id.':'.self::number($number)) : null;

        if ($rt === null) {
            throw ValidationException::withMessages(['rt' => ["RT {$number} tidak ditemukan di RW {$rw->number}."]]);
        }

        return $rt;
    }

    /**
     * Dusun dari kolom DUSUN: nama sama persis (huruf saja, "SINAR GALIH" =
     * "Sinargalih") atau beda salah ketik kecil. Tidak ditemukan -> null,
     * lalu dusun diambil dari ALAMAT/RW seperti biasa.
     *
     * @param  list<string>  $warnings
     */
    private function hamletByName(string $name, array &$warnings): ?int
    {
        $wanted = self::letters((string) preg_replace('/^\s*(DUSUN|DSN|DUSUNN)\b\.?/i', '', $name));
        $best = null;

        foreach ($this->hamletNames() as $id => $hamlet) {
            $distance = levenshtein($wanted, $hamlet);

            if ($distance <= (strlen($hamlet) >= 7 ? 2 : 1) && ($best === null || $distance < $best[0])) {
                $best = [$distance, $id];
            }
        }

        if ($best === null) {
            $warnings[] = "Dusun \"{$name}\" tidak ditemukan; dusun diambil dari ALAMAT atau RW.";

            return null;
        }

        return (int) $best[1];
    }

    /** @return array<int|string, string> id dusun => nama dusun ringkas (huruf saja) */
    private function hamletNames(): array
    {
        return $this->hamlets ??= Hamlet::query()
            ->where('village_id', $this->user->village_id)
            ->pluck('name', 'id')
            ->map(fn (string $name) => self::letters($name))
            ->filter()
            ->all();
    }

    /**
     * Cari nama dusun di dalam ALAMAT. Pembanding hanya huruf ("DUSUN SINAR
     * GALIH" -> "DUSUNSINARGALIH"), dengan toleransi salah ketik kecil
     * ("SIRNAGALIH"). Nama desa/kecamatan dibuang dulu karena bisa sama
     * dengan nama dusun ("SINARGALIH DESA CIBENDA"). Bila beberapa dusun
     * tersebut, dusun milik RW diutamakan, lalu yang paling awal disebut.
     */
    private function hamletFromAddress(string $address, int $rwHamletId): ?int
    {
        $text = preg_replace('/\b(DESA|DS|KEL|KELURAHAN|KEC|KECAMATAN|KAB|KABUPATEN)\b\.?\s*[A-Z]+/', ' ', strtoupper($address));
        $compact = self::letters((string) $text);

        if ($compact === '') {
            return null;
        }

        $positions = [];

        foreach ($this->hamletNames() as $id => $name) {
            $position = strpos($compact, $name);
            $positions[$id] = $position !== false ? $position : self::fuzzyPosition($compact, $name);
        }

        $positions = array_filter($positions, fn ($position) => $position !== null);

        if ($positions === []) {
            return null;
        }

        if (array_key_exists($rwHamletId, $positions)) {
            return $rwHamletId;
        }

        asort($positions);

        return (int) array_key_first($positions);
    }

    /** Posisi potongan teks yang paling mirip nama dusun, bila cukup mirip. */
    private static function fuzzyPosition(string $text, string $name): ?int
    {
        $length = strlen($name);
        $maxDistance = $length >= 7 ? 2 : 1;
        $best = null;

        for ($size = $length - 1; $size <= $length + 1; $size++) {
            for ($i = 0; $i + $size <= strlen($text); $i++) {
                $distance = levenshtein(substr($text, $i, $size), $name);

                if ($distance <= $maxDistance && ($best === null || $distance < $best[0])) {
                    $best = [$distance, $i];
                }
            }
        }

        return $best[1] ?? null;
    }

    private static function occupationKey(string $name): string
    {
        return trim((string) preg_replace('/[^A-Z0-9]+/', ' ', strtoupper($name)));
    }

    private static function letters(string $value): string
    {
        return (string) preg_replace('/[^A-Z]/', '', strtoupper($value));
    }

    private static function isNumber(mixed $value): bool
    {
        return is_numeric(is_string($value) ? trim($value) : $value);
    }

    private static function number(mixed $value): int
    {
        return (int) (is_string($value) ? trim($value) : $value);
    }
}
