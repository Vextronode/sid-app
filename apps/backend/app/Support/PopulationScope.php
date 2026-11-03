<?php

namespace App\Support;

use App\Enums\UserRole;
use App\Models\Citizen;
use App\Models\Family;
use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Cakupan Data Penduduk (warga dan KK) yang boleh dibaca seorang pengguna:
 *  - Staf SIDUTama, Kasi Pemerintahan, Kaur TU & Umum, Kepala Desa,
 *    Sekretaris Desa: seluruh desa;
 *  - Ketua RT: warga/KK di RT-nya;
 *  - Ketua RW: warga/KK di semua RT di bawah RW-nya;
 *  - Kepala Dusun: warga/KK di semua RT di bawah RW-RW dusunnya.
 *
 * RW dan Dusun warga/KK dibaca lewat RT-nya (sama dengan filter daftar),
 * bukan kolom rw_id/hamlet_id yang bisa tidak sinkron. Warga/KK tanpa RT
 * hanya terlihat oleh peran berlingkup desa.
 */
final class PopulationScope
{
    /** Peran berlingkup seluruh desa. */
    public const VILLAGE_ROLES = [
        UserRole::StafSid,
        UserRole::KasiPemerintahan,
        UserRole::KaurTuUmum,
        UserRole::KepalaDesa,
        UserRole::SekretarisDesa,
    ];

    /** Peran berlingkup wilayah dan kolom wilayah di officials. */
    private const AREA_COLUMNS = [
        'rt' => 'rt_id',
        'rw' => 'rw_id',
        'kadus' => 'hamlet_id',
    ];

    private function __construct(
        public readonly string $villageId,
        public readonly ?string $column = null,
        public readonly ?int $areaId = null,
    ) {}

    /**
     * Semua peran yang boleh membaca Data Penduduk.
     *
     * @return list<UserRole>
     */
    public static function readerRoles(): array
    {
        return [...self::VILLAGE_ROLES, UserRole::Rt, UserRole::Rw, UserRole::Kadus];
    }

    /** Cakupan pengguna, atau null bila ia tidak berhak membaca Data Penduduk. */
    public static function tryFor(User $user): ?self
    {
        if (! $user->is_active || $user->village_id === null) {
            return null;
        }

        $role = UserRole::tryFrom((string) $user->role);

        if (in_array($role, self::VILLAGE_ROLES, true)) {
            return new self($user->village_id);
        }

        $column = self::AREA_COLUMNS[$role?->value] ?? null;
        $official = $column ? $user->official : null;

        if (! $official || $official->position !== $role->value || ! $official->{$column}) {
            return null;
        }

        return new self($user->village_id, $column, (int) $official->{$column});
    }

    public static function for(User $user): self
    {
        return self::tryFor($user) ?? abort(403, 'Anda tidak berhak melihat Data Penduduk.');
    }

    /**
     * Batasi query warga atau KK ke cakupan ini.
     *
     * @param  Builder<Citizen>|Builder<Family>  $query
     */
    public function apply(Builder $query): Builder
    {
        $query->where($query->getModel()->qualifyColumn('village_id'), $this->villageId);

        return match ($this->column) {
            'rt_id' => $query->where($query->getModel()->qualifyColumn('rt_id'), $this->areaId),
            'rw_id' => $query->whereHas('rt', fn ($rt) => $rt->where('rw_id', $this->areaId)),
            'hamlet_id' => $query->whereHas('rt.rw', fn ($rw) => $rw->where('hamlet_id', $this->areaId)),
            default => $query,
        };
    }

    /**
     * Batasi daftar Dusun, RW, atau RT (pilihan filter) ke wilayah yang
     * memuat cakupan ini.
     *
     * @param  Builder<Hamlet>|Builder<Rw>|Builder<Rt>  $query
     */
    public function applyToRegions(Builder $query): Builder
    {
        $model = $query->getModel();
        $area = $this->areaId;

        return match ([$this->column, $model::class]) {
            ['rt_id', Rt::class] => $query->whereKey($area),
            ['rt_id', Rw::class] => $query->whereHas('rts', fn ($rt) => $rt->whereKey($area)),
            ['rt_id', Hamlet::class] => $query->whereHas('rws.rts', fn ($rt) => $rt->whereKey($area)),
            ['rw_id', Rt::class] => $query->where('rw_id', $area),
            ['rw_id', Rw::class] => $query->whereKey($area),
            ['rw_id', Hamlet::class] => $query->whereHas('rws', fn ($rw) => $rw->whereKey($area)),
            ['hamlet_id', Rt::class] => $query->whereHas('rw', fn ($rw) => $rw->where('hamlet_id', $area)),
            ['hamlet_id', Rw::class] => $query->where('hamlet_id', $area),
            ['hamlet_id', Hamlet::class] => $query->whereKey($area),
            default => $query,
        };
    }

    public function includes(Citizen|Family $record): bool
    {
        if ($record->village_id !== $this->villageId) {
            return false;
        }

        if ($this->column === null) {
            return true;
        }

        $rt = $record->rt;

        return match ($this->column) {
            'rt_id' => (int) $record->rt_id === $this->areaId,
            'rw_id' => $rt !== null && (int) $rt->rw_id === $this->areaId,
            'hamlet_id' => $rt?->rw !== null && (int) $rt->rw->hamlet_id === $this->areaId,
        };
    }
}
