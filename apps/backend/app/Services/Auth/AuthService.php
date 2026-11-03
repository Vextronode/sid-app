<?php

namespace App\Services\Auth;

use App\Models\AccountRegistration;
use App\Models\Citizen;
use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Repositories\UserRepository;
use App\Services\AccountActivationService;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AuthService
{
    /**
     * D2. Satu pesan untuk semua kegagalan pendaftaran (NIK bukan warga,
     * sudah punya akun atau masih menunggu aktivasi, NIK diblokir), supaya
     * endpoint publik ini tidak bisa dipakai menebak data kependudukan.
     * Polanya sama dengan permintaan atur ulang kata sandi.
     */
    public const REGISTRATION_FAILED = 'Pendaftaran tidak dapat diproses. Periksa kembali NIK Anda, atau datang ke kantor desa.';

    public function __construct(
        protected CitizenRepository $citizenRepository,
        protected UserRepository $userRepository,
        protected UsernameGenerator $usernameGenerator,
        protected AccountActivationService $activation,
    ) {}

    /**
     * D1/K4. Pendaftaran cukup NIK, kata sandi, dan foto wajah dari kamera.
     * NIK bukan bukti bahwa pendaftar adalah warga itu, jadi akun dibuat
     * nonaktif dan menunggu aktivasi petugas wilayah, yang memeriksa foto
     * tersebut (AccountActivationService). Pendaftaran yang pernah ditolak
     * boleh diulang memakai akun yang sama.
     *
     * @param  array{nik: string, password: string}  $data
     */
    public function registerWarga(array $data, UploadedFile $photo): User
    {
        $citizen = $this->citizenRepository->findByNikHash(hash('sha256', $data['nik']));

        if (! $citizen || ! $citizen->is_active) {
            $this->fail();
        }

        $existing = $this->userRepository->findByCitizenId($citizen->id);

        if (($existing && ! $this->canReapply($existing)) || $this->activation->isBanned($citizen->id)) {
            $this->fail();
        }

        $photoPath = $this->activation->storePhoto($citizen, $photo);

        try {
            return DB::transaction(function () use ($citizen, $data, $existing, $photoPath): User {
                $user = $existing
                    ? tap($existing)->update(['password' => $data['password']])
                    : $this->createInactiveUser($citizen, $data['password']);

                $this->activation->open($user, $citizen, $photoPath);

                return $user;
            });
        } catch (\Throwable $exception) {
            $this->activation->deletePhoto($photoPath);

            // Dua pendaftaran bersamaan untuk NIK yang sama: yang kalah kena
            // unique index (akun per warga / satu pendaftaran menunggu).
            if ($exception instanceof UniqueConstraintViolationException) {
                $this->fail();
            }

            throw $exception;
        }
    }

    /**
     * Akun nonaktif yang pendaftaran terakhirnya ditolak boleh mendaftar
     * ulang. Akun aktif, yang masih menunggu, atau yang dinonaktifkan staf
     * (tanpa riwayat pendaftaran) tidak.
     */
    private function canReapply(User $user): bool
    {
        return ! $user->is_active
            && $user->accountRegistrations()->latest('id')->value('status') === AccountRegistration::STATUS_REJECTED;
    }

    private function createInactiveUser(Citizen $citizen, string $password): User
    {
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $username = $this->usernameGenerator->generate($citizen->name);

            try {
                // Savepoint per percobaan: username bentrok tidak membatalkan transaksi luar.
                return DB::transaction(fn () => User::create([
                    'village_id' => $citizen->village_id,
                    'citizen_id' => $citizen->id,
                    'name' => $citizen->name,
                    'username' => $username,
                    'role' => 'warga',
                    'email' => null,
                    'password' => $password,
                    'is_active' => false,
                    'must_change_password' => false,
                ]));
            } catch (QueryException $exception) {
                if (! $this->isUniqueViolationFor($exception, 'username')) {
                    throw $exception;
                }
            }
        }

        throw new RuntimeException('Tidak dapat membuat username unik setelah beberapa percobaan.');
    }

    private function fail(): never
    {
        throw ValidationException::withMessages(['nik' => [self::REGISTRATION_FAILED]]);
    }

    private function isUniqueViolationFor(QueryException $exception, string $column): bool
    {
        $message = Str::lower($exception->getMessage());
        $isUniqueViolation = in_array((string) $exception->getCode(), ['23000', '23505'], true);

        return $isUniqueViolation && (
            str_contains($message, "users.{$column}") ||
            str_contains($message, "users_{$column}_unique") ||
            str_contains($message, "key ({$column})")
        );
    }
}
