<?php

namespace App\Console\Commands;

use App\Services\OfficialAssignmentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class PetugasFirstCommand extends Command
{
    protected $signature = 'petugas:first
        {--nik= : NIK calon Petugas Desa (16 digit)}
        {--name= : Nama lengkap}
        {--dob= : Tanggal lahir (YYYY-MM-DD)}
        {--gender= : Jenis kelamin (L atau P)}
        {--address= : Alamat lengkap}
        {--village= : UUID desa, wajib jika citizen belum terdaftar}
        {--rt= : ID RT, wajib jika citizen belum terdaftar}
        {--hamlet= : ID dusun (opsional)}';

    protected $description = 'Membuat akun dan mempromosikan Petugas Desa pertama.';

    public function handle(OfficialAssignmentService $assignmentService): int
    {
        $data = [
            'nik' => $this->option('nik'),
            'name' => $this->option('name'),
            'date_of_birth' => $this->option('dob'),
            'gender' => $this->option('gender'),
            'address' => $this->option('address'),
            'village_id' => $this->option('village'),
            'rt_id' => $this->option('rt'),
            'hamlet_id' => $this->option('hamlet'),
        ];

        $validator = Validator::make($data, [
            'nik' => ['required', 'digits:16'],
        ]);

        if ($validator->fails()) {
            $this->error($validator->errors()->first());

            return self::FAILURE;
        }

        try {
            $result = $assignmentService->bootstrapFirstPetugas($data);
        } catch (\RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        } catch (ValidationException $exception) {
            $this->error($exception->validator->errors()->first());

            return self::FAILURE;
        }

        $this->info("Akun {$result['user']->username} berhasil menjadi Petugas Desa pertama.");
        $this->line('Password sementara (simpan sekarang, hanya ditampilkan sekali): '.$result['temporary_password']);

        return self::SUCCESS;
    }
}
