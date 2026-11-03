<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\AccountRegistration;
use App\Models\Citizen;
use App\Models\User;
use App\Notifications\AccountApprovalNotification;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * D1/K4. Aktivasi akun warga hasil pendaftaran online. Akun dibuat nonaktif
 * lalu diputuskan petugas wilayah yang SAAT INI memegangnya (lihat
 * AreaApprovalRouter: RT, lalu RW, Kepala Dusun, atau Staf SIDUTama).
 *
 * Foto dari kamera ada di disk privat selama permintaan diproses atau
 * ditolak; begitu disetujui, foto itu menjadi foto profil akun. Menolak
 * wajib disertai catatan. NIK yang ditolak MAX_REJECTIONS kali tidak bisa
 * mendaftar online lagi; Staf SIDUTama mengaktifkannya manual setelah
 * memeriksa warga di kantor desa.
 */
class AccountActivationService
{
    private const DISK = 'private_uploads';

    public function __construct(
        private readonly AccountAuditService $audit,
        private readonly AreaApprovalRouter $router,
        private readonly UserPhotoService $photos,
    ) {}

    public function storePhoto(Citizen $citizen, UploadedFile $photo): string
    {
        return $photo->store("account-registrations/{$citizen->village_id}/{$citizen->id}", self::DISK);
    }

    public function deletePhoto(?string $path): void
    {
        if ($path !== null) {
            Storage::disk(self::DISK)->delete($path);
        }
    }

    /**
     * Membuka pendaftaran menunggu untuk akun warga yang masih nonaktif.
     * Dipanggil di dalam transaksi pendaftaran (AuthService::registerWarga).
     */
    public function open(User $user, Citizen $citizen, string $photoPath): AccountRegistration
    {
        $registration = AccountRegistration::query()->create([
            'village_id' => $citizen->village_id,
            'citizen_id' => $citizen->id,
            'user_id' => $user->id,
            ...$this->router->areaOf($citizen),
            'status' => AccountRegistration::STATUS_PENDING,
            'method' => AccountRegistration::METHOD_ONLINE,
            'photo_path' => $photoPath,
        ]);

        Notification::send($this->route($registration)['users'], new AccountApprovalNotification(
            'Permintaan Aktivasi Akun',
            "{$citizen->name} mendaftar akun warga dan menunggu aktivasi Anda.",
            'account_registration_submitted',
            ['account_registration_id' => $registration->id],
        ));

        return $registration;
    }

    /**
     * Jenjang dan akun pejabat yang saat ini memegang aktivasi.
     *
     * @return array{level: string, users: Collection<int, User>}
     */
    public function route(AccountRegistration $registration): array
    {
        return $this->router->route($registration);
    }

    public function canDecide(User $viewer, AccountRegistration $registration): bool
    {
        return $this->router->canDecide($viewer, $registration);
    }

    public function canView(User $viewer, AccountRegistration $registration): bool
    {
        return $this->router->canView($viewer, $registration);
    }

    /**
     * @param  array{status?: string|null, per_page?: int|null}  $filters
     */
    public function paginateFor(User $viewer, array $filters): LengthAwarePaginator
    {
        return $this->router->paginateFor(
            $viewer,
            AccountRegistration::query()->with(['citizen:id,name,nik', 'user:id,username', 'decider:id,name', 'rt:id,number', 'rw:id,number', 'hamlet:id,name']),
            $filters,
        );
    }

    public function approve(User $actor, AccountRegistration $registration): AccountRegistration
    {
        return DB::transaction(function () use ($actor, $registration): AccountRegistration {
            $locked = $this->lockDecidable($actor, $registration);
            $level = $this->route($locked)['level'];
            $photo = $locked->photo_path;

            $user = $locked->user ?? abort(409, 'Akun pendaftar tidak ditemukan.');
            $user->update(['is_active' => true]);

            // Foto yang sudah diperiksa petugas menjadi foto profil akun.
            if ($photo !== null) {
                $this->photos->adoptApproved($user, $photo);
            }

            $locked->update([
                'status' => AccountRegistration::STATUS_APPROVED,
                'decided_by' => $actor->id,
                'decided_level' => $level,
                'decided_at' => now(),
                'photo_path' => null,
            ]);

            $this->audit->registrationDecided($locked, $actor, 'registration_approved');
            DB::afterCommit(fn () => $this->deletePhoto($photo));

            return $locked;
        });
    }

    public function reject(User $actor, AccountRegistration $registration, string $notes): AccountRegistration
    {
        return DB::transaction(function () use ($actor, $registration, $notes): AccountRegistration {
            $locked = $this->lockDecidable($actor, $registration);

            $locked->update([
                'status' => AccountRegistration::STATUS_REJECTED,
                'decided_by' => $actor->id,
                'decided_level' => $this->route($locked)['level'],
                'decided_at' => now(),
                'decision_notes' => $notes,
            ]);

            $this->audit->registrationDecided($locked, $actor, 'registration_rejected', [
                'banned' => $this->isBanned($locked->citizen_id),
            ]);

            return $locked;
        });
    }

    /**
     * NIK yang diblokir (ditolak MAX_REJECTIONS kali) diaktifkan Staf
     * SIDUTama setelah warga diperiksa langsung di kantor desa. Kata sandi
     * diganti sementara: pendaftar online belum tentu warga yang datang.
     *
     * @return array{registration: AccountRegistration, temporary_password: string}
     */
    public function manualActivate(User $staf, AccountRegistration $registration): array
    {
        if ($staf->role !== UserRole::StafSid->value || ! $staf->is_active || $staf->village_id !== $registration->village_id) {
            abort(403, 'Aktivasi manual hanya oleh '.UserRole::stafSidLabel().' di desa yang sama.');
        }

        return DB::transaction(function () use ($staf, $registration): array {
            $locked = AccountRegistration::query()->whereKey($registration->id)->lockForUpdate()->firstOrFail();
            $latest = AccountRegistration::query()->where('citizen_id', $locked->citizen_id)->latest('id')->first();

            if (! $latest?->is($locked) || ! $this->isBanned($locked->citizen_id)) {
                abort(409, 'Aktivasi manual hanya untuk NIK yang diblokir karena ditolak '.AccountRegistration::MAX_REJECTIONS.' kali.');
            }

            $user = $locked->user ?? abort(409, 'Akun pendaftar tidak ditemukan.');
            $temporaryPassword = Str::random(12);
            $user->update(['password' => $temporaryPassword, 'must_change_password' => true, 'is_active' => true]);

            $manual = AccountRegistration::query()->create([
                ...$locked->only(['village_id', 'citizen_id', 'user_id', 'rt_id', 'rw_id', 'hamlet_id']),
                'status' => AccountRegistration::STATUS_APPROVED,
                'method' => AccountRegistration::METHOD_MANUAL,
                'decided_by' => $staf->id,
                'decided_level' => AccountRegistration::LEVEL_STAF_SID,
                'decided_at' => now(),
            ]);

            $this->audit->registrationDecided($manual, $staf, 'registration_manual_activated');

            return ['registration' => $manual, 'temporary_password' => $temporaryPassword];
        });
    }

    /**
     * Foto hanya selama diproses atau setelah ditolak, untuk yang boleh
     * melihat permintaannya.
     */
    public function photo(User $viewer, AccountRegistration $registration): StreamedResponse
    {
        if ($registration->photo_path === null || ! $this->canView($viewer, $registration)) {
            abort(404, 'Foto tidak tersedia.');
        }

        return Storage::disk(self::DISK)->response($registration->photo_path, null, [
            'Cache-Control' => 'no-store, private',
        ]);
    }

    public function rejectionCount(string $citizenId): int
    {
        return AccountRegistration::query()
            ->where('citizen_id', $citizenId)
            ->where('status', AccountRegistration::STATUS_REJECTED)
            ->count();
    }

    public function isBanned(string $citizenId): bool
    {
        return $this->rejectionCount($citizenId) >= AccountRegistration::MAX_REJECTIONS
            && ! AccountRegistration::query()
                ->where('citizen_id', $citizenId)
                ->where('status', AccountRegistration::STATUS_APPROVED)
                ->exists();
    }

    /**
     * Akun hasil pendaftaran online yang belum pernah disetujui. Akun lama
     * dan akun pejabat (tanpa riwayat pendaftaran) tidak termasuk.
     */
    public function awaitingActivation(User $user): bool
    {
        return $user->accountRegistrations()->exists()
            && ! $user->accountRegistrations()->where('status', AccountRegistration::STATUS_APPROVED)->exists();
    }

    /**
     * Pesan saat akun nonaktif mencoba masuk, atau null bila bukan karena
     * aktivasi pendaftaran.
     */
    public function loginBlockMessage(User $user): ?string
    {
        $latest = $user->accountRegistrations()->latest('id')->first();

        return match ($latest?->status) {
            AccountRegistration::STATUS_PENDING => 'Akun Anda masih menunggu aktivasi oleh petugas wilayah (RT, RW, Kepala Dusun, atau '.UserRole::stafSidLabel().'). Silakan coba lagi nanti.',
            AccountRegistration::STATUS_REJECTED => $this->isBanned($latest->citizen_id)
                ? 'Pendaftaran akun sudah ditolak '.AccountRegistration::MAX_REJECTIONS.' kali. Silakan datang ke kantor desa untuk aktivasi akun.'
                : "Pendaftaran akun ditolak. Catatan petugas: {$latest->decision_notes}. Silakan daftar ulang dengan data yang benar.",
            default => null,
        };
    }

    private function lockDecidable(User $actor, AccountRegistration $registration): AccountRegistration
    {
        $locked = AccountRegistration::query()->whereKey($registration->id)->lockForUpdate()->firstOrFail();

        if (! $locked->isPending()) {
            abort(409, 'Permintaan aktivasi ini sudah diputuskan.');
        }

        if (! $this->canDecide($actor, $locked)) {
            abort(403, 'Permintaan aktivasi ini tidak sedang menjadi wewenang Anda.');
        }

        return $locked;
    }
}
