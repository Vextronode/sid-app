<?php

namespace App\Console\Commands;

use App\Enums\OfficialPosition;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use App\Services\OfficialAssignmentService;
use Illuminate\Console\Command;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class PetugasDemoteCommand extends Command
{
    protected $signature = 'petugas:demote {username : Username Petugas Desa} {--force : Izinkan menurunkan petugas terakhir}';

    protected $description = 'Menurunkan akun Petugas Desa.';

    public function handle(
        UserRepository $userRepository,
        OfficialRepository $officialRepository,
        OfficialAssignmentService $assignmentService,
    ): int {
        $user = $userRepository->findByUsername($this->argument('username'));

        if ($user === null || $user->role !== OfficialPosition::PetugasDesa->userRole()->value) {
            $this->error('Akun Petugas Desa tidak ditemukan.');

            return self::FAILURE;
        }

        $official = $officialRepository->findActiveByUserId($user->id);

        if ($official === null || $official->position !== OfficialPosition::PetugasDesa->value) {
            $this->error('Jabatan Petugas Desa aktif tidak ditemukan.');

            return self::FAILURE;
        }

        try {
            $result = $assignmentService->demoteFromCommand($official, (bool) $this->option('force'));
        } catch (HttpExceptionInterface $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        foreach ($result['warnings'] as $warning) {
            $this->warn($warning['message']);
        }

        $this->info("Petugas Desa {$user->username} berhasil diturunkan.");

        return self::SUCCESS;
    }
}
