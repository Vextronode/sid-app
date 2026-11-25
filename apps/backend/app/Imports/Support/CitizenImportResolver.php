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
 * - RW dicari dari nomornya di seluruh desa (nomor RW unik se-desa, tidak
 *   mulai lagi di tiap dusun), lalu RT dicari di dalam RW itu. "001" sama
 *   dengan "1".
 * - Kolom RT/RW gabungan ("001/003") dipecah menjadi RT dan RW.
 * - Dusun tidak diambil dari file: Citizen menurunkannya dari RT -> RW.
 *   Kolom DUSUN hanya dibandingkan; bila berbeda dengan dusun RW, baris
 *   tetap diimpor dengan peringatan supaya Staf bisa memeriksa datanya.
 * - NKK dipakai untuk menautkan ke KK yang ada atau membuat KK baru.
 *
 * Data wilayah dimuat sekali per impor.
 */
final class CitizenImportResolver
{
    /** @var Collection<int, Rw>|null RW desa, key = id */
    private ?Collection $rws = null;

    /** @var Collection<int, Rt>|null RT desa, key = id */
    private ?Collection $rts = null;

    /** @var array<int|string, string>|null id dusun => nama dusun */
    private ?array $hamlets = null;

    /** @var array<string, Occupation>|null nama pekerjaan ternormalisasi => pekerjaan */
    private ?array $occupations = null;

    public function __construct(
        private readonly User $user,
        private readonly FamilyService $familyService,
        private readonly FamilyRepository $familyRepository,
    ) {}

    /**
     * Isi rt_id dari kolom rt/rw/rt_rw. Baris yang sudah membawa rt_id
     * (template sistem) tidak dicari lagi. Kolom DUSUN hanya dibandingkan
     * dengan dusun milik RW dari RT tersebut.
     *
     * @param  array<string, mixed>  $data
     * @param  list<string>  $warnings  dusun di file yang tidak cocok dengan RW
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

        $hamletName = trim((string) ($data['hamlet'] ?? ''));
        unset($data['rt_rw'], $data['hamlet']);

        // Template sistem memakai rt_id langsung; jalur ini untuk file desa.
        if (! isset($data['rt_id']) && (isset($data['rw']) || isset($data['rt']))) {
            $data['rt_id'] = $this->findRt($this->findRw($data['rw'] ?? null), $data['rt'] ?? null)->id;
        }

        if ($hamletName !== '' && isset($data['rt_id'])) {
            $this->compareHamlet($hamletName, $data['rt_id'], $warnings);
        }

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
     * ID KK untuk No KK ini; KK baru dibuat dengan alamat & RT warga pertama
     * yang memakainya (RW dan Dusun KK diturunkan dari RT). Dipanggil di
     * dalam transaksi baris supaya KK ikut batal bila warganya gagal disimpan.
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

        return $this->familyService->create([
            'no_kk' => $noKk,
            'family_address' => $data['address'],
            'rt_id' => $data['rt_id'] ?? null,
        ], $this->user)->id;
    }

    private function findRw(mixed $number): Rw
    {
        $rw = self::isNumber($number)
            ? $this->rws()->first(fn (Rw $rw) => self::number($rw->number) === self::number($number))
            : null;

        if ($rw === null) {
            throw ValidationException::withMessages(['rw' => ["RW {$number} tidak ditemukan di data wilayah desa."]]);
        }

        return $rw;
    }

    private function findRt(Rw $rw, mixed $number): Rt
    {
        $rt = self::isNumber($number)
            ? $this->rts()->first(fn (Rt $rt) => (int) $rt->rw_id === (int) $rw->id
                && self::number($rt->number) === self::number($number))
            : null;

        if ($rt === null) {
            throw ValidationException::withMessages(['rt' => ["RT {$number} tidak ditemukan di RW {$rw->number}."]]);
        }

        return $rt;
    }

    /**
     * Bandingkan kolom DUSUN dengan dusun milik RW dari RT warga. Dusun yang
     * disimpan tetap dusun RW; yang tidak cocok hanya diberi peringatan.
     *
     * @param  list<string>  $warnings
     */
    private function compareHamlet(string $name, mixed $rtId, array &$warnings): void
    {
        $rt = $this->rts()->get((int) $rtId);
        $rw = $rt !== null ? $this->rws()->get((int) $rt->rw_id) : null;

        // RT dari desa lain atau tidak ada: baris ditolak validasi/service.
        if ($rw === null) {
            return;
        }

        $named = $this->hamletByName($name);

        if ($named === (int) $rw->hamlet_id) {
            return;
        }

        $rwHamlet = $this->hamlets()[$rw->hamlet_id] ?? '-';
        $warnings[] = $named === null
            ? "Dusun \"{$name}\" tidak ditemukan; dusun mengikuti RW {$rw->number} ({$rwHamlet})."
            : "Dusun \"{$name}\" berbeda dengan dusun RW {$rw->number} ({$rwHamlet}); dusun mengikuti RW.";
    }

    /**
     * Dusun dari kolom DUSUN: nama sama persis (huruf saja, "SINAR GALIH" =
     * "Sinargalih") atau beda salah ketik kecil. Tidak ditemukan -> null.
     */
    private function hamletByName(string $name): ?int
    {
        $wanted = self::letters((string) preg_replace('/^\s*(DUSUN|DSN|DUSUNN)\b\.?/i', '', $name));
        $best = null;

        foreach ($this->hamlets() as $id => $hamlet) {
            $hamlet = self::letters($hamlet);

            if ($hamlet === '') {
                continue;
            }

            $distance = levenshtein($wanted, $hamlet);

            if ($distance <= (strlen($hamlet) >= 7 ? 2 : 1) && ($best === null || $distance < $best[0])) {
                $best = [$distance, $id];
            }
        }

        return $best === null ? null : (int) $best[1];
    }

    /** @return Collection<int, Rw> */
    private function rws(): Collection
    {
        return $this->rws ??= Rw::query()
            ->where('village_id', $this->user->village_id)
            ->get()
            ->keyBy('id');
    }

    /** @return Collection<int, Rt> */
    private function rts(): Collection
    {
        return $this->rts ??= Rt::query()
            ->where('village_id', $this->user->village_id)
            ->get()
            ->keyBy('id');
    }

    /** @return array<int|string, string> id dusun => nama dusun */
    private function hamlets(): array
    {
        return $this->hamlets ??= Hamlet::query()
            ->where('village_id', $this->user->village_id)
            ->pluck('name', 'id')
            ->all();
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
