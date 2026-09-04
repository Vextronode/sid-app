<?php

namespace app\Services;

use app\Repositories\LetterCategoryRepository;
use Illuminate\Database\Eloquent\Collection;

class LetterCategoryService
{
    public function __construct(
        private readonly LetterCategoryRepository $repository,
    ) {
    }

    /**
     * Ambil seluruh kategori surat (termasuk yang nonaktif), sesuai
     * kontrak GET /letter-categories di api_spec_v5.
     */
    public function getAllCategories(): Collection
    {
        return $this->repository->all();
    }

    /**
     * Ambil satu kategori berdasarkan code, atau null bila tidak ada.
     */
    public function getByCode(string $code)
    {
        return $this->repository->findByCode($code);
    }

    /**
     * Ambil seluruh kategori yang aktif saja.
     */
    public function getActiveCategories(): Collection
    {
        return $this->repository->findAllActive();
    }
}
