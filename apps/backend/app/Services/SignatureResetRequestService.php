<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\SignatureResetRequest;
use App\Models\User;
use App\Notifications\SignatureResetNotification;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/**
 * Pengajuan reset tanda tangan oleh pemilik akun. Staf SIDUTama desa yang
 * sama menyetujui (TTD aktif dicabut lewat UserSignatureService::reset,
 * yang sekaligus menutup pengajuan pending) atau menolak (tanpa aksi).
 */
class SignatureResetRequestService
{
    public function __construct(
        protected UserSignatureService $userSignatureService
    ) {}

    public function pendingFor(User $user): ?SignatureResetRequest
    {
        return SignatureResetRequest::query()
            ->where('user_id', $user->id)
            ->where('status', SignatureResetRequest::STATUS_PENDING)
            ->latest('id')
            ->first();
    }

    public function submit(User $user, string $reason): SignatureResetRequest
    {
        if ($user->role === UserRole::StafSid->value) {
            abort(403, UserRole::stafSidLabel().' mengatur ulang tanda tangan lewat Manajemen Pengguna.');
        }

        if ($this->userSignatureService->active($user) === null) {
            abort(409, 'Anda belum memiliki tanda tangan.');
        }

        $resetRequest = DB::transaction(function () use ($user, $reason): SignatureResetRequest {
            // Kunci baris akun agar dua pengajuan bersamaan tidak lolos.
            User::query()->whereKey($user->id)->lockForUpdate()->first();

            if ($this->pendingFor($user) !== null) {
                abort(409, 'Pengajuan reset tanda tangan Anda masih diproses.');
            }

            return SignatureResetRequest::query()->create([
                'user_id' => $user->id,
                'reason' => $reason,
                'status' => SignatureResetRequest::STATUS_PENDING,
            ]);
        });

        $staff = User::query()
            ->where('role', UserRole::StafSid->value)
            ->where('village_id', $user->village_id)
            ->where('is_active', true)
            ->get();

        Notification::send($staff, new SignatureResetNotification(
            'Pengajuan Reset Tanda Tangan',
            "{$user->name} mengajukan reset tanda tangan.",
            'signature_reset_requested',
        ));

        return $resetRequest;
    }

    /**
     * Seluruh pengajuan di desa petugas: yang masih pending di atas,
     * lalu riwayat (disetujui/ditolak) dari yang terbaru.
     */
    public function forVillage(User $actor, int $perPage): LengthAwarePaginator
    {
        return SignatureResetRequest::query()
            ->with(['user:id,name,username,role,village_id', 'handler:id,name'])
            ->whereHas('user', fn ($query) => $query->where('village_id', $actor->village_id))
            ->orderByRaw('CASE WHEN status = ? THEN 0 ELSE 1 END', [SignatureResetRequest::STATUS_PENDING])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function approve(User $actor, SignatureResetRequest $resetRequest): void
    {
        $this->ensureHandleable($actor, $resetRequest);

        // Tanpa TTD aktif tidak ada yang dicabut; cukup tutup pengajuannya.
        if ($this->userSignatureService->active($resetRequest->user) === null) {
            $this->userSignatureService->closeResetRequests($actor, $resetRequest->user);

            return;
        }

        // reset() menandai pengajuan ini disetujui dan memberi tahu pemiliknya.
        $this->userSignatureService->reset(
            $actor,
            $resetRequest->user,
            "Pengajuan pemilik akun: {$resetRequest->reason}",
        );
    }

    public function reject(User $actor, SignatureResetRequest $resetRequest, ?string $notes): void
    {
        $this->ensureHandleable($actor, $resetRequest);

        $resetRequest->update([
            'status' => SignatureResetRequest::STATUS_REJECTED,
            'handled_by' => $actor->id,
            'handled_at' => now(),
            'response_notes' => $notes,
        ]);

        $resetRequest->user->notify(new SignatureResetNotification(
            'Pengajuan Reset Tanda Tangan Ditolak',
            $notes
                ? "Pengajuan reset tanda tangan Anda ditolak: {$notes}"
                : 'Pengajuan reset tanda tangan Anda ditolak.',
            'signature_reset_rejected',
            'red',
        ));
    }

    private function ensureHandleable(User $actor, SignatureResetRequest $resetRequest): void
    {
        if (
            $actor->role !== UserRole::StafSid->value
            || ! $actor->is_active
            || $actor->village_id === null
            || $actor->village_id !== $resetRequest->user?->village_id
        ) {
            abort(403, 'Pengajuan ini hanya dapat diproses '.UserRole::stafSidLabel().' di desa yang sama.');
        }

        if ($resetRequest->status !== SignatureResetRequest::STATUS_PENDING) {
            abort(409, 'Pengajuan ini sudah diproses.');
        }
    }
}
