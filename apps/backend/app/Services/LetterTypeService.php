<?php

namespace App\Services;

use App\Models\LetterType;
use App\Repositories\ApprovalFlowRepository;
use App\Repositories\LetterTypeRepository;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class LetterTypeService
{
    public function __construct(
        protected LetterTypeRepository $letterTypeRepository,
        protected ApprovalFlowRepository $approvalFlowRepository,
    ) {}

    public function getActiveWithTemplate(User $user): Collection
    {
        return $this->letterTypeRepository->allActiveWithTemplate($this->villageId($user));
    }

    /**
     * EV5-12-S1 (UC-21 MVP). Petugas Desa boleh pindahkan tipe surat ke
     * category/flow lain (Config over Code) - flow_id yang dipilih
     * wajib milik desa dan category_id efektif (yang dikirim, atau
     * yang sudah ada di record kalau tidak dikirim), sesuai
     * paths/letter-types/letter-type-detail.yaml.
     */
    public function update(LetterType $letterType, array $data, User $user): LetterType
    {
        $villageId = $this->villageId($user);
        $letterType = $this->letterTypeRepository->findOrFail($letterType->id, $villageId);
        if (array_key_exists('category_id', $data) || array_key_exists('flow_id', $data)) {
            $effectiveCategoryId = $data['category_id'] ?? $letterType->category_id;
            $effectiveFlowId = $data['flow_id'] ?? $letterType->flow_id;

            $this->guardFlowBelongsToCategory($effectiveFlowId, $effectiveCategoryId, $villageId);
        }

        return $this->letterTypeRepository->update($letterType, $data);
    }

    private function guardFlowBelongsToCategory(int $flowId, int $categoryId, string $villageId): void
    {
        $flow = $this->approvalFlowRepository->findByIdForVillage($flowId, $villageId);

        if (! $flow || $flow->category_id !== $categoryId) {
            throw ValidationException::withMessages([
                'flow_id' => ['Flow yang dipilih tidak termasuk dalam kategori surat ini'],
            ]);
        }
    }

    private function villageId(User $user): string
    {
        if (! $user->is_active || ! $user->village_id) abort(403, 'Akun aktif dengan desa yang valid diperlukan.');
        return $user->village_id;
    }
}
