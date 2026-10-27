<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Services\UserService;
use Illuminate\Console\Command;
use RuntimeException;

/**
 * A-18. Pemulihan darurat bila satu-satunya Staf SIDUTama desa lupa kata
 * sandi. Hanya mereset kata sandi akun staf_sid aktif; pergantian
 * pemegang jabatan tetap lewat rotasi di aplikasi.
 */
class StafSidRecoverCommand extends Command
{
    protected $signature = 'staf-sid:recover
        {--username= : Username akun Staf SIDUTama desa yang dipulihkan}
        {--force : Lewati konfirmasi (untuk eksekusi non-interaktif)}';

    protected $description = 'Reset kata sandi Staf SIDUTama desa (staf_sid) aktif dengan kata sandi sementara.';

    public function handle(UserService $userService): int
    {
        $username = trim((string) $this->option('username'));

        if ($username === '') {
            $this->error('Opsi --username wajib diisi.');

            return self::FAILURE;
        }

        $label = UserRole::stafSidLabel();

        if (! $this->option('force') && ! $this->confirm("Reset kata sandi {$label} \"{$username}\"? Semua sesi akun ini akan keluar.")) {
            $this->warn('Dibatalkan.');

            return self::FAILURE;
        }

        try {
            $result = $userService->recoverStafSid($username);
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info("Kata sandi {$label} {$result['user']->username} berhasil direset. Semua sesi lama telah dikeluarkan.");
        $this->line('Password sementara (simpan sekarang, hanya ditampilkan sekali): '.$result['temporary_password']);
        $this->line('Akun wajib mengganti kata sandi saat login. Bila login terkunci karena terlalu banyak percobaan, tunggu hingga 1 jam.');

        return self::SUCCESS;
    }
}
