<?php

namespace App\Services;

use App\Models\LetterType;
use App\Repositories\ApprovalFlowRepository;
use App\Repositories\LetterTypeRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class LetterTypeService
{
    public function __construct(
        protected LetterTypeRepository $letterTypeRepository,
        protected ApprovalFlowRepository $approvalFlowRepository,
    ) {}

    public function getActiveWithTemplate(): Collection
    {
        return $this->letterTypeRepository->allActiveWithTemplate();
    }

    /**
     * EV5-12-S1 (UC-21 MVP). Petugas Desa boleh pindahkan tipe surat ke
     * category/flow lain (Config over Code) - flow_id yang dipilih
     * WAJIB milik category_id efektif (yang dikirim, atau yang sudah
     * ada di record kalau tidak dikirim), sesuai
     * paths/letter-types/letter-type-detail.yaml.
     */
    public function update(LetterType $letterType, array $data): LetterType
    {
        if (array_key_exists('category_id', $data) || array_key_exists('flow_id', $data)) {
            $effectiveCategoryId = $data['category_id'] ?? $letterType->category_id;
            $effectiveFlowId = $data['flow_id'] ?? $letterType->flow_id;

            $this->guardFlowBelongsToCategory($effectiveFlowId, $effectiveCategoryId);
        }

        return $this->letterTypeRepository->update($letterType, $data);
    }

    private function guardFlowBelongsToCategory(int $flowId, int $categoryId): void
    {
        $flow = $this->approvalFlowRepository->findById($flowId);

        if (! $flow || $flow->category_id !== $categoryId) {
            throw ValidationException::withMessages([
                'flow_id' => ['Flow yang dipilih tidak termasuk dalam kategori surat ini'],
            ]);
        }
    }
}
