<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Models\Letter;
use App\Models\Official;
use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Repositories\LetterRepository;
use App\Repositories\NotificationRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\HttpException;

class DashboardService
{
    private const VILLAGE_HEAD_POSITIONS = ['kepala_desa', 'sekdes'];

    public function __construct(
        protected CitizenRepository $citizenRepository,
        protected LetterRepository $letterRepository,
        protected NotificationRepository $notificationRepository,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function getDashboard(User $user): array
    {
        return match ($user->role) {
            'warga' => $this->forWarga($user),
            'rt' => $this->forRt($user),
            'rw' => $this->forRw($user),
            'kasi_pelayanan', 'kaur_tu_umum' => $this->forKasiKaur($user),
            'petugas_desa' => $this->forPetugasDesa($user),
            'kepala_desa', 'sekretaris_desa' => $this->forKadesSekdes($user),
            default => throw new HttpException(403, 'Dashboard tidak tersedia untuk role ini.'),
        };
    }

    /**
     * @return array{total: int, laki: int, perempuan: int}
     */
    public function getGenderStats(User $user): array
    {
        [$rtId, $rwId] = $this->resolveLegacyScope($user);

        $laki = $this->citizenRepository->countByGender($user->village_id, 'L', $rtId, $rwId);
        $perempuan = $this->citizenRepository->countByGender($user->village_id, 'P', $rtId, $rwId);

        return [
            'total' => $laki + $perempuan,
            'laki' => $laki,
            'perempuan' => $perempuan,
        ];
    }

    /**
     * @return array{chart: array{labels: array<int, string>, values: array<int, int>, maxY: int}}
     */
    public function getLetterStats(User $user, ?string $date, ?string $letterType): array
    {
        [$rtId, $rwId] = $this->resolveLegacyScope($user);
        $parsedDate = Carbon::parse($date ?: now()->toDateString());

        if ($rtId !== null) {
            $query = $this->letterRepository->queryByVillageAndRt($user->village_id, $rtId);
        } elseif ($rwId !== null) {
            $query = $this->letterRepository->queryByVillageAndRw($user->village_id, $rwId);
        } else {
            $query = $this->letterRepository->queryByVillage($user->village_id);
        }

        if ($letterType && $letterType !== 'all') {
            $query->where('letter_type_id', $letterType);
        }

        $labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
        $startOfWeek = $parsedDate->copy()->startOfWeek(Carbon::MONDAY);
        $values = [];

        foreach ($labels as $index => $label) {
            $values[] = $this->letterRepository->countSubmittedOnDate(
                $query,
                $startOfWeek->copy()->addDays($index),
            );
        }

        $maxValue = max($values);

        return [
            'chart' => [
                'labels' => $labels,
                'values' => $values,
                'maxY' => max(50, (int) ceil($maxValue / 5) * 5),
            ],
        ];
    }

    /**
     * @return array{role: string, my_letters: array<int, array<string, mixed>>, unread_notifications_count: int}
     */
    private function forWarga(User $user): array
    {
        $letters = $this->letterRepository
            ->querySubmittedBy($user->id)
            ->latest()
            ->get();

        return [
            'role' => 'warga',
            'my_letters' => $letters->map(fn (Letter $letter): array => [
                'id' => $letter->id,
                'letter_type_name' => $letter->letterType?->name,
                'status' => $this->statusValue($letter),
                'current_stage_label' => $this->stageLabel($letter),
            ])->values()->all(),
            'unread_notifications_count' => $this->unreadCount($user),
        ];
    }

    /**
     * @return array{role: string, total_pending: int, total_processed: int, pending_letters: array<int, array<string, mixed>>, unread_notifications_count: int}
     */
    private function forRt(User $user): array
    {
        $official = $this->activeOfficial($user, 'rt');
        $pending = $this->letterRepository
            ->queryByStatusesAndCitizenRt(
                [LetterStatus::Pending->value, LetterStatus::InProgress->value],
                $official->rt_id,
            )
            ->whereHas('flow.steps', function ($query) {
                $query->whereColumn('step_order', 'letters.current_step_order')
                    ->where('approver_position', 'rt');
            })
            ->latest()
            ->get();

        $processed = $this->letterRepository
            ->queryByStatusesAndCitizenRt(
                [LetterStatus::Approved->value, LetterStatus::Rejected->value],
                $official->rt_id,
            )
            ->count();

        return [
            'role' => 'rt',
            'total_pending' => $pending->count(),
            'total_processed' => $processed,
            'pending_letters' => $this->letterSummaries($pending),
            'unread_notifications_count' => $this->unreadCount($user),
        ];
    }

    /**
     * @return array{role: string, fyi_letters: array<int, array<string, mixed>>, unread_notifications_count: int}
     */
    private function forRw(User $user): array
    {
        $official = $this->activeOfficial($user, 'rw');
        $letters = $this->letterRepository
            ->queryByCitizenRw($official->rw_id)
            ->latest()
            ->get();

        return [
            'role' => 'rw',
            'fyi_letters' => $this->letterSummaries($letters),
            'unread_notifications_count' => $this->unreadCount($user),
        ];
    }

    /**
     * @return array{role: string, total_menunggu_final: int, pending_letters: array<int, array<string, mixed>>, unread_notifications_count: int}
     */
    private function forKasiKaur(User $user): array
    {
        $official = $this->activeOfficial($user, $user->role);
        $letters = $this->letterRepository
            ->queryPendingAtFinalStepPosition($official->position, $official->village_id)
            ->latest()
            ->get();

        return [
            'role' => $user->role,
            'total_menunggu_final' => $letters->count(),
            'pending_letters' => $this->letterSummaries($letters),
            'unread_notifications_count' => $this->unreadCount($user),
        ];
    }

    /**
     * @return array{role: string, total_warga: int, total_surat_bulan_ini: int, surat_per_status: array<string, int>, unread_notifications_count: int}
     */
    private function forPetugasDesa(User $user): array
    {
        $villageId = $this->villageId($user);

        return [
            'role' => 'petugas_desa',
            'total_warga' => $this->citizenRepository->countActiveByVillage($villageId),
            'total_surat_bulan_ini' => $this->letterRepository->countByVillageInMonth($villageId),
            'surat_per_status' => $this->letterRepository->countByVillageAndStatuses(
                $villageId,
                array_map(fn (LetterStatus $status): string => $status->value, LetterStatus::cases()),
            ),
            'unread_notifications_count' => $this->unreadCount($user),
        ];
    }

    /**
     * @return array{role: string, total_menunggu_approval: int, pending_letters: array<int, array<string, mixed>>, unread_notifications_count: int}
     */
    private function forKadesSekdes(User $user): array
    {
        $official = $this->activeOfficial($user, $this->officialPositionForRole($user->role));
        $letters = $this->letterRepository
            ->queryPendingAtFlowStepPositions(
                self::VILLAGE_HEAD_POSITIONS,
                $official->village_id,
            )
            ->whereIn('status', [
                LetterStatus::Pending->value,
                LetterStatus::InProgress->value,
            ])
            ->latest()
            ->get();

        return [
            'role' => $user->role,
            'total_menunggu_approval' => $letters->count(),
            'pending_letters' => $this->letterSummaries($letters),
            'unread_notifications_count' => $this->unreadCount($user),
        ];
    }

    private function activeOfficial(User $user, string $position): Official
    {
        $official = $user->official()
            ->where('position', $position)
            ->where('is_active', true)
            ->first();

        if (! $official) {
            $positionLabel = match ($position) {
                'rt', 'rw' => strtoupper($position),
                default => $position,
            };

            throw new HttpException(403, "Data official {$positionLabel} tidak ditemukan.");
        }

        return $official;
    }

    private function officialPositionForRole(string $role): string
    {
        return $role === 'sekretaris_desa' ? 'sekdes' : $role;
    }

    /**
     * Legacy statistics endpoint scope. The generic dashboard uses explicit
     * role builders above and rejects kadus.
     *
     * @return array{0: int|null, 1: int|null}
     */
    private function resolveLegacyScope(User $user): array
    {
        return match ($user->role) {
            'rt' => [$this->activeOfficial($user, 'rt')->rt_id, null],
            'rw' => [null, $this->activeOfficial($user, 'rw')->rw_id],
            'kasi_pelayanan', 'kaur_tu_umum', 'petugas_desa' => [null, null],
            default => throw new HttpException(403, 'Tidak memiliki akses.'),
        };
    }

    private function villageId(User $user): int
    {
        if (! $user->village_id) {
            throw new HttpException(403, 'Data desa user tidak ditemukan.');
        }

        return $user->village_id;
    }

    private function unreadCount(User $user): int
    {
        return $this->notificationRepository->countUnreadForUser($user);
    }

    private function statusValue(Letter $letter): string
    {
        return $letter->status instanceof LetterStatus
            ? $letter->status->value
            : (string) $letter->status;
    }

    private function stageLabel(Letter $letter): string
    {
        if ($this->statusValue($letter) === LetterStatus::Approved->value) {
            return 'Selesai';
        }

        if ($this->statusValue($letter) === LetterStatus::Rejected->value) {
            return 'Ditolak';
        }

        $step = $letter->currentFlowStep();

        return match ($step?->approver_position) {
            'rt' => 'Menunggu RT',
            'kepala_desa', 'sekdes' => 'Menunggu Kepala Desa / Sekretaris Desa',
            'kasi_pelayanan' => 'Menunggu Kasi Pelayanan',
            'kaur_tu_umum' => 'Menunggu Kaur TU Umum',
            default => 'Sedang Diproses',
        };
    }

    /**
     * @param  Collection<int, Letter>  $letters
     * @return array<int, array<string, mixed>>
     */
    private function letterSummaries(Collection $letters): array
    {
        return $letters->map(fn (Letter $letter): array => [
            'id' => $letter->id,
            'letter_type_name' => $letter->letterType?->name,
            'status' => $this->statusValue($letter),
            'current_step_order' => $letter->current_step_order,
            'is_overdue' => (bool) $letter->is_overdue,
        ])->values()->all();
    }
}
