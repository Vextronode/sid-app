<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\User;
use App\Repositories\LetterRepository;
use Illuminate\Database\Eloquent\Collection;

class RwApprovalService
{
    public function __construct(
        protected LetterRepository $letterRepository,
    ) {}

    public function getPendingLetters(User $user): Collection
    {
        $official = $user->official;

        if (! $official) {
            abort(403, 'Data official tidak ditemukan.');
        }

        if (! $official->rw_id) {
            abort(403, 'Data wilayah RW tidak ditemukan.');
        }

        return $this->letterRepository
            ->queryByStatusesAndCitizenRw(['pending'], $official->rw_id)
            ->latest()
            ->get();
    }

    /**
     * Detail satu surat untuk dilihat RW, dibatasi hanya surat yang
     * berada di wilayah RW milik user (guard wilayah, bukan guard
     * kewenangan approve — RW memang tidak punya kewenangan itu).
     */
    public function getLetterDetail(Letter $letter, User $user): Letter
    {
        $official = $user->official;

        if (! $official) {
            abort(403, 'Data official tidak ditemukan.');
        }

        $letter = $letter->loadMissing([
            'citizen.rt',
            'letterType',
            'approvals.approvedBy:id,name',
        ]);

        if ($letter->citizen?->rt?->rw_id !== $official->rw_id) {
            abort(403, 'Anda tidak berwenang melihat surat ini.');
        }

        return $letter;
    }
}
