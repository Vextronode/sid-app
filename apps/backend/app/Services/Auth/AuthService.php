<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Repositories\UserRepository;
use Illuminate\Database\QueryException;
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
     * @param  array{nik: string, password: string}  $data
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
