<?php

namespace App\Console\Commands;

use App\Repositories\UserRepository;
use App\Services\UserService;
use Illuminate\Console\Command;

class PetugasResetPasswordCommand extends Command
{
    protected $signature = 'petugas:reset-password {username : Username akun}';

    protected $description = 'Membuat kata sandi sementara untuk akun.';

    public function handle(UserRepository $userRepository, UserService $userService): int
    {
        $user = $userRepository->findByUsername($this->argument('username'));

        if ($user === null) {
            $this->error('Akun tidak ditemukan.');

            return self::FAILURE;
        }

        $temporaryPassword = $userService->resetPasswordForCommand($user);

        $this->info("Kata sandi sementara untuk {$user->username}: {$temporaryPassword}");
        $this->warn('Berikan kata sandi ini kepada pengguna secara aman. Kata sandi hanya ditampilkan sekali.');

        return self::SUCCESS;
    }
}
