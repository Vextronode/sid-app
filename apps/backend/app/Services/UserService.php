<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Database\Eloquent\Collection;

class UserService
{
    public function __construct(
        protected UserRepository $userRepository
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
}
