<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Services\VillageInstallService;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class SidInstallCommand extends Command
{
    protected $signature = 'sid:install
        {--village-name= : Nama desa, mis. "Desa Sukamaju"}
        {--village-code= : Kode wilayah desa Kemendagri, 10 digit tanpa titik}
        {--head-name= : Nama Kepala Desa (opsional)}
        {--district= : Kecamatan (opsional)}
        {--regency= : Kabupaten/Kota (opsional)}
        {--province= : Provinsi (opsional)}
        {--postal-code= : Kode pos (opsional)}
        {--dusun= : Nama dusun Staf SIDUTama (opsional, diisi bersama --rw dan --rt)}
        {--rw= : Nomor RW Staf SIDUTama (opsional)}
        {--rt= : Nomor RT Staf SIDUTama (opsional)}
        {--nik= : NIK Staf SIDUTama pertama (16 digit)}
        {--name= : Nama lengkap Staf SIDUTama}
        {--dob= : Tanggal lahir Staf SIDUTama (YYYY-MM-DD)}
        {--gender= : Jenis kelamin Staf SIDUTama (L atau P)}
        {--address= : Alamat Staf SIDUTama}';

    protected $description = 'Memasang desa pada instalasi baru: desa, data acuan, dan Staf SIDUTama pertama.';

    /** Opsi wajib => pertanyaan bila kosong pada terminal interaktif. */
    private const REQUIRED_PROMPTS = [
        'village-name' => 'Nama desa',
        'village-code' => 'Kode desa (10 digit Kemendagri)',
        'nik' => 'NIK Staf SIDUTama',
        'name' => 'Nama lengkap Staf SIDUTama',
        'dob' => 'Tanggal lahir Staf SIDUTama (YYYY-MM-DD)',
        'gender' => 'Jenis kelamin Staf SIDUTama (L/P)',
        'address' => 'Alamat Staf SIDUTama',
    ];

    public function handle(VillageInstallService $installService): int
    {
        $input = $this->collectInput();

        try {
            $result = $installService->install(
                [
                    'name' => $input['village-name'],
                    'code' => $input['village-code'],
                    'head_name' => $input['head-name'],
                    'district' => $input['district'],
                    'regency' => $input['regency'],
                    'province' => $input['province'],
                    'postal_code' => $input['postal-code'],
                ],
                [
                    'hamlet' => $input['dusun'],
                    'rw' => $input['rw'],
                    'rt' => $input['rt'],
                ],
                [
                    'nik' => $input['nik'],
                    'name' => $input['name'],
                    'date_of_birth' => $input['dob'],
                    'gender' => $input['gender'] !== null ? strtoupper($input['gender']) : null,
                    'address' => $input['address'],
                ],
            );
        } catch (ValidationException $exception) {
            $this->error($exception->validator->errors()->first());

            return self::FAILURE;
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $village = $result['village'];
        $this->info("{$village->name} ({$village->code}) berhasil dipasang beserta data acuannya.");
        $this->info("Akun {$result['user']->username} menjadi ".UserRole::stafSidLabel().' pertama.');
        $this->line('Password sementara (simpan sekarang, hanya ditampilkan sekali): '.$result['temporary_password']);

        if ($result['rt'] === null) {
            $this->line('Wilayah belum dibuat. Setelah masuk, buat Dusun/RW/RT di Kelola Wilayah lalu lengkapi RT data warga '.UserRole::stafSidLabel().'.');
        }
        $this->line('Lengkapi identitas desa (alamat, logo, kontak) di Kelola Profil Desa.');

        return self::SUCCESS;
    }

    /**
     * @return array<string, ?string>
     */
    private function collectInput(): array
    {
        $input = [];
        foreach (array_keys($this->getDefinition()->getOptions()) as $name) {
            $value = $this->option($name);
            $input[$name] = is_string($value) && trim($value) !== '' ? trim($value) : null;
        }

        if ($this->input->isInteractive()) {
            foreach (self::REQUIRED_PROMPTS as $name => $question) {
                if ($input[$name] === null) {
                    $answer = $this->ask($question);
                    $input[$name] = is_string($answer) && trim($answer) !== '' ? trim($answer) : null;
                }
            }
        }

        return $input;
    }
}
