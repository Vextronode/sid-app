<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\PasswordResetRequest;
use App\Models\User;
use App\Notifications\PasswordResetRequestNotification;
use App\Repositories\CitizenRepository;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Lupa kata sandi tanpa email. Pengaju (belum login) dikenali lewat NIK +
 * tanggal lahir, lalu menerima token klaim acak yang disimpan di
 * browsernya. Staf SIDUTama desa yang sama menyetujui atau menolak.
 * Setelah disetujui, hanya pemegang token klaim yang dapat membuat kata
 * sandi baru, paling lambat APPROVAL_TTL_HOURS jam setelah persetujuan.
 */
class PasswordResetRequestService
{
    private const IDENTITY_MISMATCH = 'NIK atau tanggal lahir tidak cocok dengan akun mana pun. Periksa kembali, atau datang ke kantor desa.';

    /** Status yang masih "hidup" dan digantikan bila akun mengajukan lagi. */
    private const OPEN_STATUSES = [
        PasswordResetRequest::STATUS_PENDING,
        PasswordResetRequest::STATUS_APPROVED,
    ];

    public function __construct(
        protected CitizenRepository $citizenRepository
    ) {}

    /**
     * @return array{request: PasswordResetRequest, token: string}
     */
    public function submit(string $nik, string $dateOfBirth, ?string $ip): array
    {
        $user = $this->resolveUser($nik, $dateOfBirth);
        $token = Str::random(64);

        $resetRequest = DB::transaction(function () use ($user, $token, $ip): PasswordResetRequest {
            // Kunci baris akun agar dua pengajuan bersamaan tidak sama-sama
            // lolos sebagai permintaan aktif.
            User::query()->whereKey($user->id)->lockForUpdate()->first();

            // Pengajuan baru menggantikan yang lama: token klaim lama (mis.
            // di perangkat lain) tidak lagi berlaku.
            PasswordResetRequest::query()
                ->where('user_id', $user->id)
                ->whereIn('status', self::OPEN_STATUSES)
                ->update(['status' => PasswordResetRequest::STATUS_CANCELLED]);

            return PasswordResetRequest::query()->create([
                'user_id' => $user->id,
                'claim_token_hash' => PasswordResetRequest::hashToken($token),
                'status' => PasswordResetRequest::STATUS_PENDING,
                'requester_ip' => $ip,
            ]);
        });

        $staff = User::query()
            ->where('role', UserRole::StafSid->value)
            ->where('village_id', $user->village_id)
            ->where('is_active', true)
            ->get();

        Notification::send($staff, new PasswordResetRequestNotification(
            'Permintaan Atur Ulang Kata Sandi',
            "{$user->name} ({$user->username}) meminta atur ulang kata sandi.",
            'password_reset_requested',
            $resetRequest->id,
        ));

        return ['request' => $resetRequest, 'token' => $token];
    }

    public function findByToken(string $token): PasswordResetRequest
    {
        $resetRequest = PasswordResetRequest::query()
            ->with('user:id,name,username,is_active')
            ->where('claim_token_hash', PasswordResetRequest::hashToken($token))
            ->first();

        if ($resetRequest === null) {
            abort(404, 'Permintaan atur ulang kata sandi tidak ditemukan. Ajukan permintaan baru.');
        }

        return $resetRequest;
    }

    public function complete(string $token, string $password): void
    {
        DB::transaction(function () use ($token, $password): void {
            $resetRequest = PasswordResetRequest::query()
                ->where('claim_token_hash', PasswordResetRequest::hashToken($token))
                ->lockForUpdate()
                ->first();

            if ($resetRequest === null) {
                abort(404, 'Permintaan atur ulang kata sandi tidak ditemukan. Ajukan permintaan baru.');
            }

            if (! $resetRequest->isClaimable()) {
                abort(409, match ($resetRequest->effectiveStatus()) {
                    PasswordResetRequest::STATUS_PENDING => 'Permintaan Anda belum disetujui '.UserRole::stafSidLabel().'.',
                    PasswordResetRequest::STATUS_EXPIRED => 'Batas waktu membuat kata sandi baru sudah lewat. Ajukan permintaan baru.',
                    default => 'Permintaan ini sudah tidak berlaku. Ajukan permintaan baru.',
                });
            }

            $user = User::query()->whereKey($resetRequest->user_id)->lockForUpdate()->firstOrFail();

            if (! $user->is_active) {
                abort(403, 'Akun tidak aktif, hubungi administrator');
            }

            $user->forceFill([
                'password' => $password,
                'remember_token' => Str::random(60),
                'must_change_password' => false,
            ])->save();

            $user->tokens()->delete();

            $resetRequest->update([
                'status' => PasswordResetRequest::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);

            event(new PasswordReset($user));
        });
    }

    /**
     * Seluruh permintaan di desa petugas: yang masih pending di atas, lalu
     * riwayat dari yang terbaru.
     */
    public function forVillage(User $actor, ?string $status, int $perPage): LengthAwarePaginator
    {
        return PasswordResetRequest::query()
            ->with([
                'user:id,name,username,role,village_id,citizen_id,email',
                'user.citizen:id,nik,rt_id,hamlet_id',
                'user.citizen.rt:id,number,rw_id',
                'user.citizen.rt.rw:id,number',
                'user.citizen.hamlet:id,name',
                'handler:id,name',
            ])
            ->whereHas('user', fn ($query) => $query->where('village_id', $actor->village_id))
            ->when($status, fn ($query) => $query->where('status', $status))
            ->orderByRaw('CASE WHEN status = ? THEN 0 ELSE 1 END', [PasswordResetRequest::STATUS_PENDING])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function approve(User $actor, PasswordResetRequest $resetRequest): void
    {
        $this->ensureHandleable($actor, $resetRequest);

        $resetRequest->update([
            'status' => PasswordResetRequest::STATUS_APPROVED,
            'handled_by' => $actor->id,
            'handled_at' => now(),
            'approved_until' => now()->addHours(PasswordResetRequest::APPROVAL_TTL_HOURS),
        ]);
    }

    public function reject(User $actor, PasswordResetRequest $resetRequest, ?string $notes): void
    {
        $this->ensureHandleable($actor, $resetRequest);

        $resetRequest->update([
            'status' => PasswordResetRequest::STATUS_REJECTED,
            'handled_by' => $actor->id,
            'handled_at' => now(),
            'response_notes' => $notes,
        ]);
    }

    /**
     * Semua kegagalan (NIK tidak ada, tanggal lahir salah, belum punya akun,
     * akun nonaktif) dilaporkan dengan pesan yang sama supaya endpoint ini
     * tidak bisa dipakai untuk menebak data kependudukan.
     */
    private function resolveUser(string $nik, string $dateOfBirth): User
    {
        $citizen = $this->citizenRepository->findByNikHash(hash('sha256', $nik));

        $user = $citizen?->date_of_birth && Carbon::parse($dateOfBirth)->isSameDay($citizen->date_of_birth)
            ? User::query()->where('citizen_id', $citizen->id)->first()
            : null;

        if ($user === null || ! $user->is_active) {
            throw ValidationException::withMessages(['nik' => [self::IDENTITY_MISMATCH]]);
        }

        // Selaras dengan Manajemen Pengguna: kata sandi Staf SIDUTama tidak
        // diatur ulang dari aplikasi, hanya lewat pemulihan CLI.
        if ($user->role === UserRole::StafSid->value) {
            abort(403, 'Kata sandi '.UserRole::stafSidLabel().' tidak dapat diatur ulang lewat permintaan ini. Hubungi pengelola sistem.');
        }

        return $user;
    }

    private function ensureHandleable(User $actor, PasswordResetRequest $resetRequest): void
    {
        $resetRequest->loadMissing('user:id,village_id');

        if (
            $actor->role !== UserRole::StafSid->value
            || ! $actor->is_active
            || $actor->village_id === null
            || $actor->village_id !== $resetRequest->user?->village_id
        ) {
            abort(403, 'Permintaan ini hanya dapat diproses '.UserRole::stafSidLabel().' di desa yang sama.');
        }

        if ($resetRequest->status !== PasswordResetRequest::STATUS_PENDING) {
            abort(409, 'Permintaan ini sudah diproses.');
        }
    }
}
