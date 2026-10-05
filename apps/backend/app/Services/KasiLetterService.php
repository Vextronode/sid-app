<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
use App\Repositories\LetterRepository;
use Illuminate\Database\Eloquent\Collection;

class KasiLetterService
{
    private const AUTHORIZED_POSITIONS = ['kasi_pelayanan', 'kaur_tu_umum'];

    public function __construct(protected LetterRepository $letterRepository) {}

    public function getCompletedLetters(User $user): Collection
    {
        $official = $this->authorizeUser($user);

        return $this->letterRepository
            ->queryApprovedForAssignedRole($user->role, $official->village_id)
            ->latest()
            ->get();
    }

    public function getLetterDetail(Letter $letter, User $user): Letter
    {
        $official = $this->authorizeUser($user);

        $letter = $this->letterRepository->loadDetailForApproval($letter);

        if (
            $letter->status !== LetterStatus::Approved
            || $letter->village_id !== $official->village_id
            || ($letter->letterType->assigned_role !== null && $letter->letterType->assigned_role !== $user->role)
        ) {
            abort(403, 'Anda tidak berwenang melihat surat ini.');
        }

        return $letter;
    }

    private function authorizeUser(User $user): Official
    {
        if (! in_array($user->role, self::AUTHORIZED_POSITIONS, true)) {
            abort(403, 'Anda tidak berwenang mengakses approval Kasi/Kaur.');
        }

        $official = $user->official;
        if (! $official || $official->position !== $user->role || $official->village_id === null) {
            abort(403, 'Data wilayah desa tidak ditemukan.');
        }

        return $official;
    }
}
