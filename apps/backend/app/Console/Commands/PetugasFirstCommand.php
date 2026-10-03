<?php

namespace App\Console\Commands;

use App\Repositories\UserRepository;
use App\Services\OfficialAssignmentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class PetugasFirstCommand extends Command
{
    protected $signature = 'petugas:first
        {--nik= : NIK 16 digit}
        {--name= : Nama lengkap}
        {--dob= : Tanggal lahir YYYY-MM-DD}
        {--gender= : Jenis kelamin L atau P}
        {--address= : Alamat}
        {--username= : Username akun}
        {--village= : UUID desa}
        {--password= : Kata sandi awal}';

    protected $description = 'Membuat akun dan jabatan Petugas Desa pertama.';

    public function handle(OfficialAssignmentService $assignmentService): int
    {
        $data = [
            'nik' => $this->option('nik'),
            'name' => $this->option('name'),
            'date_of_birth' => $this->option('dob'),
            'gender' => $this->option('gender'),
            'address' => $this->option('address'),
            'username' => $this->option('username'),
            'village_id' => $this->option('village'),
        ];

        $validator = Validator::make($data, [
            'nik' => ['required', 'digits:16'],
            'name' => ['required', 'string', 'max:255'],
            'date_of_birth' => ['required', 'date'],
            'gender' => ['required', 'in:L,P'],
            'address' => ['required', 'string'],
            'username' => ['nullable', 'regex:/^[a-z0-9_.]{4,30}$/'],
            'village_id' => ['required', 'uuid', 'exists:villages,id'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        if ($data['username'] !== null && app(UserRepository::class)->usernameExists($data['username'])) {
            $this->error('Username sudah digunakan.');

            return self::FAILURE;
        }

        $password = $this->option('password') ?: $this->secret('Masukkan kata sandi awal');

        if (! is_string($password) || $password === '') {
            $this->error('Kata sandi awal wajib diisi.');

            return self::FAILURE;
        }

        $data['password'] = $password;

        try {
            $user = $assignmentService->bootstrapFirstPetugas($data);
        } catch (\RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info("Petugas Desa pertama berhasil dibuat: {$user->username}");

        return self::SUCCESS;
    }
}
