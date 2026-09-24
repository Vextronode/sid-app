<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class UserRepository
{
    public function __construct()
    {
        //
    }

    public function findByCitizenId(int $citizenId): ?User
    {
        return User::query()->where('citizen_id', $citizenId)->first();
    }

    public function allWithCitizenAndOfficial(): Collection
    {
        return User::with([
            'citizen.rt',
            'citizen.rw',
            'official',
        ])
            ->latest()
            ->get();
    }

    public function toggleActive(User $user): User
    {
        $user->update([
            'is_active' => ! $user->is_active,
        ]);

        return $user;
    }

    public function create(array $data): User
    {
        return User::create($data);
    }

    public function update(User $user, array $data): User
    {
        $user->update($data);

        return $user;
    }

    public function updateRole(int $userId, string $role): void
    {
        User::query()->whereKey($userId)->update(['role' => $role]);
    }

    /**
     * Dipakai UserService::update() untuk guard "tidak dapat
     * menonaktifkan satu-satunya akun Petugas Desa yang masih aktif".
     */
    public function countActiveByRole(string $role): int
    {
        return User::query()
            ->where('role', $role)
            ->where('is_active', true)
            ->count();
    }

    /**
     * Mencerminkan query asli pada closure route GET /user:
     * eager-load profil lengkap (citizen beserta village/hamlet/rt/rw,
     * dan official) untuk user yang sedang login.
     */
    public function findWithFullProfile(User $user): User
    {
        return $user->load([
            'citizen.village',
            'citizen.hamlet',
            'citizen.rt',
            'citizen.rw',
            'official',
        ]);
    }
}
