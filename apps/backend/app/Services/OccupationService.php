<?php

namespace App\Services;

use App\Exceptions\OccupationInUseException;
use App\Models\Occupation;
use App\Models\User;
use App\Models\Village;
use App\Repositories\OccupationRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class OccupationService
{
    private const DEFAULT_NAMES = [
        'Tidak bekerja',
        'Pelajar/Mahasiswa',
        'Ibu rumah tangga',
    ];

    public function __construct(
        private readonly OccupationRepository $repository,
    ) {}

    public function list(User $user, bool $includeInactive = false): Collection
    {
        return $this->repository->allForVillage($this->villageId($user), $includeInactive);
    }

    public function create(User $user, array $data): Occupation
    {
        $villageId = $this->villageId($user);
        $this->guardUniqueName($villageId, $data['name']);

        try {
            return $this->repository->create([
                ...$data,
                'village_id' => $villageId,
                'is_active' => $data['is_active'] ?? true,
                'sort_order' => $data['sort_order'] ?? 0,
            ]);
        } catch (QueryException $exception) {
            $this->throwIfNameUniqueViolation($exception);
            throw $exception;
        }
    }

    public function update(User $user, int $id, array $data): Occupation
    {
        $villageId = $this->villageId($user);
        $occupation = $this->repository->findForVillageOrFail($id, $villageId);

        if (array_key_exists('name', $data)) {
            $this->guardUniqueName($villageId, $data['name'], $occupation->id);
        }

        try {
            return $this->repository->update($occupation, $data);
        } catch (QueryException $exception) {
            $this->throwIfNameUniqueViolation($exception);
            throw $exception;
        }
    }

    public function delete(User $user, int $id): void
    {
        $villageId = $this->villageId($user);
        $occupation = $this->repository->findForVillageOrFail($id, $villageId);

        try {
            DB::transaction(function () use ($occupation): void {
                $citizenCount = $occupation->citizens()->count();

                if ($citizenCount > 0) {
                    throw new OccupationInUseException($citizenCount);
                }

                $this->repository->delete($occupation);
            });
        } catch (QueryException $exception) {
            if ($this->isForeignKeyViolation($exception)) {
                throw new OccupationInUseException($occupation->citizens()->count());
            }

            throw $exception;
        }
    }

    public function seedDefaultsForVillage(Village $village): void
    {
        foreach (self::DEFAULT_NAMES as $sortOrder => $name) {
            Occupation::query()->updateOrCreate(
                ['village_id' => $village->id, 'name' => $name],
                ['is_active' => true, 'sort_order' => $sortOrder],
            );
        }
    }

    private function guardUniqueName(string $villageId, string $name, ?int $excludeId = null): void
    {
        $duplicate = Occupation::query()
            ->where('village_id', $villageId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->when($excludeId !== null, fn ($query) => $query->whereKeyNot($excludeId))
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages(['name' => ['Nama pekerjaan sudah digunakan di desa ini.']]);
        }
    }

    private function throwIfNameUniqueViolation(QueryException $exception): void
    {
        $sqlState = (string) ($exception->errorInfo[0] ?? $exception->getCode());
        $message = strtolower($exception->getMessage());

        if (
            in_array($sqlState, ['23505', '23000', '19'], true)
            && str_contains($message, 'occupations_village_name_ci_unique')
        ) {
            throw ValidationException::withMessages(['name' => ['Nama pekerjaan sudah digunakan di desa ini.']]);
        }
    }

    private function isForeignKeyViolation(QueryException $exception): bool
    {
        $sqlState = (string) ($exception->errorInfo[0] ?? $exception->getCode());
        $message = strtolower($exception->getMessage());

        return $sqlState === '23503'
            || (in_array($sqlState, ['23000', '19'], true) && str_contains($message, 'foreign key constraint'));
    }

    private function villageId(User $user): string
    {
        if ($user->role !== 'petugas_desa' || ! $user->is_active || ! $user->village_id) {
            throw new HttpException(403, 'Petugas Desa aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
