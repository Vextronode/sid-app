<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserService
{
    public function __construct(
        protected UserRepository $userRepository,
        protected OfficialService $officialService,
    ) {}

    public function getAllWithCitizenAndOfficial(): Collection
    {
        return $this->userRepository->allWithCitizenAndOfficial();
    }

    public function toggleActive(User $user): User
    {
        return $this->userRepository->toggleActive($user);
    }

    public function getCurrentUserProfile(User $user): User
    {
        return $this->userRepository->findWithFullProfile($user);
    }

    /**
     * UC-14 Tambah Akun. Jika position_data terkirim, sekaligus INSERT
     * ke officials. Jika position_data.position='sekdes', users.role
     * di-override jadi 'sekretaris_desa' apa pun nilai field role yang
     * dikirim (paths/users/users.yaml, tidak berubah dari v4.2).
     *
     * village_id akun baru & official diturunkan dari village_id
     * petugas_desa yang membuatnya - request tidak mengirim village_id
     * (pola sama seperti CitizenService::create()).
     */
    public function create(array $data, User $actingUser): User
    {
        return DB::transaction(function () use ($data, $actingUser) {
            $positionData = $data['position_data'] ?? null;
            $isSekdes = ($positionData['position'] ?? null) === 'sekdes';

            $user = $this->userRepository->create([
                'village_id' => $actingUser->village_id,
                'citizen_id' => $data['citizen_id'],
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role' => $isSekdes ? 'sekretaris_desa' : $data['role'],
                'is_active' => true,
            ]);

            if ($positionData) {
                $this->officialService->create([
                    'citizen_id' => $data['citizen_id'],
                    'user_id' => $user->id,
                    'position' => $positionData['position'],
                    'village_id' => $actingUser->village_id,
                    'rt_id' => $positionData['rt_id'] ?? null,
                    'rw_id' => $positionData['rw_id'] ?? null,
                    'hamlet_id' => $positionData['hamlet_id'] ?? null,
                    'started_at' => $positionData['started_at'],
                    'is_active' => true,
                ]);
            }

            return $user->fresh()->load('official');
        });
    }

    /**
     * UC-14 Edit/Nonaktifkan Akun. Guard (tidak berubah dari v4.2):
     * tidak bisa menonaktifkan diri sendiri, dan tidak bisa
     * menonaktifkan satu-satunya akun petugas_desa aktif yang tersisa
     * (paths/users/user-detail.yaml).
     */
    public function update(User $user, array $data, User $actingUser): User
    {
        $deactivating = array_key_exists('is_active', $data) && ! $data['is_active'] && $user->is_active;

        if ($deactivating) {
            if ($user->id === $actingUser->id) {
                abort(403, 'Anda tidak dapat menonaktifkan akun Anda sendiri.');
            }

            if ($user->role === 'petugas_desa' && $this->userRepository->countActiveByRole('petugas_desa') <= 1) {
                abort(403, 'Tidak dapat menonaktifkan satu-satunya akun Petugas Desa yang masih aktif.');
            }
        }

        return $this->userRepository->update($user, $data);
    }
}
