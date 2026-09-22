<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\CitizenRepository;
use App\Repositories\UserRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function __construct(
        protected CitizenRepository $citizenRepository,
        protected UserRepository $userRepository,
    ) {}

    /**
     * @param  array{nik: string, name: string, email: string, password: string}  $data
     */
    public function registerWarga(array $data): User
    {
        $nikHash = hash('sha256', $data['nik']);

        $citizen = $this->citizenRepository->findByNikHash($nikHash);

        if (! $citizen) {
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

        return DB::transaction(function () use ($data, $citizen) {
            return User::create([
                'village_id' => $citizen->village_id,
                'citizen_id' => $citizen->id,
                'name' => $data['name'],
                'role' => 'warga',
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'is_active' => true,
            ]);
        });
    }
}
