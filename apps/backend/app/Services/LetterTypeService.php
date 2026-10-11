<?php

namespace App\Services;

use App\Models\LetterType;
use App\Models\User;
use App\Repositories\LetterTypeRepository;
use Illuminate\Database\Eloquent\Collection;

class LetterTypeService
{
    public function __construct(
        protected LetterTypeRepository $letterTypeRepository,
    ) {}

    public function getActiveWithTemplate(User $user): Collection
    {
        return $this->letterTypeRepository->allActiveWithTemplate($this->villageId($user));
    }

    public function update(LetterType $letterType, array $data, User $user): LetterType
    {
        $letterType = $this->letterTypeRepository->findOrFail($letterType->id, $this->villageId($user));

        return $this->letterTypeRepository->update($letterType, $data);
    }

    private function villageId(User $user): string
    {
        if (! $user->is_active || ! $user->village_id) {
            abort(403, 'Akun aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
