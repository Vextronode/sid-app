<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\User;
use App\Repositories\LetterRepository;
use Illuminate\Database\Eloquent\Collection;

class RwFyiService
{
    public function __construct(
        protected LetterRepository $letterRepository,
        protected OfficialService $officialService,
    ) {}

    public function getFyiLetters(User $user): Collection
    {
        $official = $this->officialService->getCurrentOfficial($user);

        if (! $official->rw_id) {
            abort(403, 'Data wilayah RW tidak ditemukan.');
        }

        return $this->letterRepository
            ->queryByCitizenRw($official->rw_id)
            ->latest()
            ->get();
    }

    /**
     * Detail satu surat untuk dilihat RW, dibatasi hanya surat yang
     * berada di wilayah RW milik user (guard wilayah, bukan guard
     * kewenangan approval — RW memang tidak punya kewenangan itu).
     */
    public function getFyiLetterDetail(Letter $letter, User $user): Letter
    {
        $official = $this->officialService->getCurrentOfficial($user);

        $letter = $this->letterRepository->loadDetailForRw($letter);

        if ($letter->citizen?->rt?->rw_id !== $official->rw_id) {
            abort(403, 'Anda tidak berwenang melihat surat ini.');
        }

        return $letter;
    }
}
