<?php

namespace App\Services\Auth;

use App\Models\Citizen;
use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Repositories\UserRepository;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AuthService
{
    public function __construct(
        protected CitizenRepository $citizenRepository,
        protected UserRepository $userRepository,
        protected UsernameGenerator $usernameGenerator,
    ) {}

    /**
     * @param  array{nik: string, date_of_birth: string, password: string}  $data
     */
    public function registerWarga(array $data): User
    {
        $nikHash = hash('sha256', $data['nik']);

        $citizen = $this->citizenRepository->findByNikHash($nikHash);

        if (! $citizen || ! $citizen->is_active) {
            throw ValidationException::withMessages([
                'nik' => ['NIK tidak terdaftar sebagai warga Desa Cibenda'],
            ]);
        }

        $this->guardMatchingDateOfBirth($citizen, $data['date_of_birth']);

        $existingUser = $this->userRepository->findByCitizenId($citizen->id);

        if ($existingUser) {
            throw ValidationException::withMessages([
                'nik' => ['NIK sudah terdaftar, silakan login'],
            ]);
        }

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $username = $this->usernameGenerator->generate($citizen->name);

            try {
                return DB::transaction(fn () => User::create([
                    'village_id' => $citizen->village_id,
                    'citizen_id' => $citizen->id,
                    'name' => $citizen->name,
                    'username' => $username,
                    'role' => 'warga',
                    'email' => null,
                    'password' => $data['password'],
                    'is_active' => true,
                    'must_change_password' => false,
                ]));
            } catch (QueryException $exception) {
                if ($this->isUniqueViolationFor($exception, 'citizen_id')) {
                    throw ValidationException::withMessages([
                        'nik' => ['NIK sudah terdaftar, silakan login'],
                    ]);
                }

                if (! $this->isUniqueViolationFor($exception, 'username')) {
                    throw $exception;
                }
            }
        }

        throw new RuntimeException('Tidak dapat membuat username unik setelah beberapa percobaan.');
    }

    /**
     * Verifikasi kedua (selain NIK) bahwa pendaftar memang warga yang
     * bersangkutan: tanggal lahir dari request harus cocok dengan
     * citizens.date_of_birth - mencegah pendaftaran hanya bermodal NIK
     * yang bocor/tersebar tanpa tahu data kependudukan yang sebenarnya.
     */
    private function guardMatchingDateOfBirth(Citizen $citizen, string $dateOfBirth): void
    {
        $matches = $citizen->date_of_birth
            && Carbon::parse($dateOfBirth)->isSameDay($citizen->date_of_birth);

        if (! $matches) {
            throw ValidationException::withMessages([
                'date_of_birth' => ['Tanggal lahir tidak sesuai dengan data kependudukan'],
            ]);
        }
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
