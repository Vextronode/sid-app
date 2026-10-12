<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;

class ProfileService
{
    public function __construct(
        protected UserRepository $userRepository,
    ) {}

    public function updateProfile(User $user, array $data): User
    {
        if (array_key_exists('email', $data) && $data['email'] !== $user->email) {
            $user->email_verified_at = null;
        }

        return $this->userRepository->update($user, $data);
    }

    public function updatePassword(User $user, array $data): User
    {
        return $this->userRepository->update($user, [
            'password' => $data['password'],
            'must_change_password' => false,
        ]);
    }
}
