<?php

namespace App\Services;

use App\Repositories\LetterTypeRepository;
use Illuminate\Database\Eloquent\Collection;

class LetterTypeService
{
    public function __construct(
        protected LetterTypeRepository $letterTypeRepository
    ) {}

    public function getActiveWithTemplate(): Collection
    {
        return $this->letterTypeRepository->allActiveWithTemplate();
    }
}
