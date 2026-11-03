<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\ProfilePhotoRequest;
use App\Models\User;
use App\Notifications\AccountApprovalNotification;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * D1/K4. Warga mengganti foto profil akunnya lewat permintaan yang
 * diputuskan petugas wilayah, dengan jenjang yang sama seperti aktivasi
 * akun (AreaApprovalRouter). Foto diambil dari kamera dan ada di disk
 * privat selama diproses atau setelah ditolak; begitu disetujui, foto itu
 * menjadi foto profil akun. Menolak wajib disertai catatan.
 *
 * Hanya akun warga: akun yang menjabat memakai foto pejabat yang dikelola
 * Staf SIDUTama. Staf SIDUTama tetap bisa mengganti foto warga langsung
 * (UserPhotoService::replaceFor).
 */
class ProfilePhotoRequestService
{
    private const DISK = 'private_uploads';

    public function __construct(
        private readonly AccountAuditService $audit,
        private readonly AreaApprovalRouter $router,
        private readonly UserPhotoService $photos,
    ) {}

    public function latestFor(User $user): ?ProfilePhotoRequest
    {
        return ProfilePhotoRequest::query()->where('user_id', $user->id)->latest('id')->first();
    }

    public function submit(User $user, UploadedFile $photo): ProfilePhotoRequest
    {
        $this->assertWarga($user, 403);

        if ($this->latestFor($user)?->isPending()) {
            $this->failPending();
        }

        $user->loadMissing('citizen');
        $photoPath = $photo->store("profile-photo-requests/{$user->village_id}/{$user->id}", self::DISK);

        try {
            return DB::transaction(function () use ($user, $photoPath): ProfilePhotoRequest {
                $photoRequest = ProfilePhotoRequest::query()->create([
                    'village_id' => $user->village_id,
                    'user_id' => $user->id,
                    'citizen_id' => $user->citizen_id,
                    ...$this->router->areaOf($user->citizen),
                    'status' => ProfilePhotoRequest::STATUS_PENDING,
                    'photo_path' => $photoPath,
                ]);

                Notification::send($this->router->route($photoRequest)['users'], new AccountApprovalNotification(
                    'Permintaan Ganti Foto Profil',
                    "{$user->name} meminta mengganti foto profil akunnya.",
                    'profile_photo_requested',
                    ['profile_photo_request_id' => $photoRequest->id],
                ));

                return $photoRequest;
            });
        } catch (\Throwable $exception) {
            Storage::disk(self::DISK)->delete($photoPath);

            // Dua kiriman bersamaan: yang kalah kena unique index menunggu.
            if ($exception instanceof UniqueConstraintViolationException) {
                $this->failPending();
            }

            throw $exception;
        }
    }

    /**
     * Jenjang dan akun pejabat yang saat ini memegang permintaan.
     *
     * @return array{level: string, users: Collection<int, User>}
     */
    public function route(ProfilePhotoRequest $photoRequest): array
    {
        return $this->router->route($photoRequest);
    }

    public function canDecide(User $viewer, ProfilePhotoRequest $photoRequest): bool
    {
        return $this->router->canDecide($viewer, $photoRequest);
    }

    /**
     * @param  array{status?: string|null, per_page?: int|null}  $filters
     */
    public function paginateFor(User $viewer, array $filters): LengthAwarePaginator
    {
        return $this->router->paginateFor(
            $viewer,
            ProfilePhotoRequest::query()->with(['user:id,name,username,photo_img', 'citizen:id,name,nik', 'decider:id,name', 'rt:id,number', 'rw:id,number', 'hamlet:id,name']),
            $filters,
        );
    }

    public function approve(User $actor, ProfilePhotoRequest $photoRequest): ProfilePhotoRequest
    {
        return DB::transaction(function () use ($actor, $photoRequest): ProfilePhotoRequest {
            $locked = $this->lockDecidable($actor, $photoRequest);
            $user = $locked->user ?? abort(409, 'Akun peminta tidak ditemukan.');
            $photo = $locked->photo_path ?? abort(409, 'Foto permintaan tidak ditemukan.');

            // Akun yang sudah menjabat memakai foto pejabat; permintaannya
            // hanya bisa ditolak.
            $this->assertWarga($user, 409, 'Akun ini sedang menjabat dan memakai foto pejabat. Tolak permintaan ini.');

            $this->photos->adoptApproved($user, $photo);

            $locked->update([
                'status' => ProfilePhotoRequest::STATUS_APPROVED,
                'decided_by' => $actor->id,
                'decided_level' => $this->router->route($locked)['level'],
                'decided_at' => now(),
                'photo_path' => null,
            ]);

            $this->audit->photoRequestDecided($locked, $actor, 'profile_photo_approved');
            $user->notify(new AccountApprovalNotification(
                'Foto Profil Disetujui',
                'Permintaan ganti foto profil Anda disetujui. Foto baru sudah terpasang.',
                'profile_photo_approved',
                ['profile_photo_request_id' => $locked->id],
            ));
            DB::afterCommit(fn () => Storage::disk(self::DISK)->delete($photo));

            return $locked;
        });
    }

    public function reject(User $actor, ProfilePhotoRequest $photoRequest, string $notes): ProfilePhotoRequest
    {
        return DB::transaction(function () use ($actor, $photoRequest, $notes): ProfilePhotoRequest {
            $locked = $this->lockDecidable($actor, $photoRequest);

            $locked->update([
                'status' => ProfilePhotoRequest::STATUS_REJECTED,
                'decided_by' => $actor->id,
                'decided_level' => $this->router->route($locked)['level'],
                'decided_at' => now(),
                'decision_notes' => $notes,
            ]);

            $this->audit->photoRequestDecided($locked, $actor, 'profile_photo_rejected');
            $locked->user?->notify(new AccountApprovalNotification(
                'Foto Profil Ditolak',
                "Permintaan ganti foto profil Anda ditolak. Catatan petugas: {$notes}",
                'profile_photo_rejected',
                ['profile_photo_request_id' => $locked->id],
            ));

            return $locked;
        });
    }

    /**
     * Foto hanya selama diproses atau setelah ditolak, untuk petugas yang
     * boleh melihat permintaannya.
     */
    public function photo(User $viewer, ProfilePhotoRequest $photoRequest): StreamedResponse
    {
        if ($photoRequest->photo_path === null || ! $this->router->canView($viewer, $photoRequest)) {
            abort(404, 'Foto tidak tersedia.');
        }

        return Storage::disk(self::DISK)->response($photoRequest->photo_path, null, [
            'Cache-Control' => 'no-store, private',
        ]);
    }

    private function lockDecidable(User $actor, ProfilePhotoRequest $photoRequest): ProfilePhotoRequest
    {
        $locked = ProfilePhotoRequest::query()->whereKey($photoRequest->id)->lockForUpdate()->firstOrFail();

        if (! $locked->isPending()) {
            abort(409, 'Permintaan ganti foto ini sudah diputuskan.');
        }

        if (! $this->router->canDecide($actor, $locked)) {
            abort(403, 'Permintaan ganti foto ini tidak sedang menjadi wewenang Anda.');
        }

        return $locked;
    }

    private function assertWarga(User $user, int $status, ?string $message = null): void
    {
        if ($user->role !== 'warga') {
            abort($status, $message ?? 'Foto pejabat dikelola '.UserRole::stafSidLabel().' lewat halaman Pejabat Desa.');
        }
    }

    private function failPending(): never
    {
        abort(409, 'Permintaan ganti foto Anda masih menunggu persetujuan petugas.');
    }
}
