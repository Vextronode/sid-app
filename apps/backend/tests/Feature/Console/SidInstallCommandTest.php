<?php

namespace Tests\Feature\Console;

use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\LetterType;
use App\Models\NewsCategory;
use App\Models\Occupation;
use App\Models\Official;
use App\Models\OfficialPositionType;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use App\Models\VillageOrgPosition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SidInstallCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_install_creates_village_reference_data_and_first_staff_without_area(): void
    {
        $this->artisan('sid:install', $this->installOptions())
            ->expectsOutputToContain('Desa Sukamaju (3201010001) berhasil dipasang')
            ->expectsOutputToContain('Password sementara')
            ->expectsOutputToContain('Kelola Wilayah')
            ->assertExitCode(0);

        $village = Village::query()->sole();
        $this->assertSame('Desa Sukamaju', $village->name);
        $this->assertSame('3201010001', $village->code);
        $this->assertSame('Cibadak', $village->district);
        $this->assertSame('Sukabumi', $village->regency);
        $this->assertNull($village->province);

        foreach ([OfficialPositionType::class, NewsCategory::class, Occupation::class, LetterType::class, VillageOrgPosition::class] as $model) {
            $this->assertTrue($model::query()->where('village_id', $village->id)->exists(), "{$model} belum terisi.");
        }

        $this->assertSame(0, Hamlet::query()->count());
        $user = User::query()->sole();
        $this->assertSame('staf_sid', $user->role);
        $this->assertSame($village->id, $user->village_id);
        $this->assertTrue($user->must_change_password);
        $this->assertSame('Siti Aminah', $user->citizen->name);
        $this->assertSame('P', $user->citizen->gender);
        $this->assertNull($user->citizen->rt_id);
        $this->assertNull($user->citizen->hamlet_id);
        $this->assertTrue(Official::query()->where('user_id', $user->id)->where('position', 'staf_sid')->where('is_active', true)->exists());
    }

    public function test_install_creates_the_staff_area_when_requested(): void
    {
        $this->artisan('sid:install', [...$this->installOptions(), '--dusun' => 'Cikaret', '--rw' => '2', '--rt' => '005'])
            ->assertExitCode(0);

        $village = Village::query()->sole();
        $hamlet = Hamlet::query()->sole();
        $this->assertSame('Cikaret', $hamlet->name);
        $this->assertSame('320101000101', $hamlet->code);
        $rw = Rw::query()->sole();
        $this->assertSame('002', $rw->number);
        $this->assertSame($hamlet->id, $rw->hamlet_id);
        $rt = Rt::query()->sole();
        $this->assertSame('005', $rt->number);
        $this->assertSame($village->id, $rt->village_id);

        $citizen = User::query()->sole()->citizen;
        $this->assertSame($rt->id, $citizen->rt_id);
        $this->assertSame($hamlet->id, $citizen->hamlet_id);
    }

    public function test_install_is_rejected_when_a_village_already_exists(): void
    {
        Village::factory()->create();

        $this->artisan('sid:install', $this->installOptions())
            ->expectsOutputToContain('Desa sudah terpasang')
            ->assertExitCode(1);

        $this->assertSame(1, Village::query()->count());
        $this->assertSame(0, User::query()->count());
    }

    public function test_install_requires_all_area_options_together(): void
    {
        $this->artisan('sid:install', [...$this->installOptions(), '--dusun' => 'Cikaret', '--rt' => '1'])
            ->expectsOutputToContain('Opsi --dusun, --rw, dan --rt harus diisi bersama.')
            ->assertExitCode(1);

        $this->assertNothingInstalled();
    }

    public function test_install_rejects_invalid_staff_and_village_data_before_writing(): void
    {
        $this->artisan('sid:install', [...$this->installOptions(), '--nik' => '123'])
            ->expectsOutputToContain('NIK')
            ->assertExitCode(1);
        $this->artisan('sid:install', [...$this->installOptions(), '--village-code' => '32.01.01.0001'])
            ->expectsOutputToContain('Kode desa harus 10 digit')
            ->assertExitCode(1);
        $this->artisan('sid:install', [...$this->installOptions(), '--gender' => 'X'])
            ->expectsOutputToContain('Jenis kelamin harus L atau P.')
            ->assertExitCode(1);
        $this->artisan('sid:install', [...$this->installOptions(), '--rw' => '0', '--rt' => '1', '--dusun' => 'Cikaret'])
            ->expectsOutputToContain('Nomor RW harus angka 1 sampai 999.')
            ->assertExitCode(1);

        $this->assertNothingInstalled();
    }

    public function test_install_without_interaction_fails_on_missing_required_options(): void
    {
        $options = $this->installOptions();
        unset($options['--village-name']);

        $this->artisan('sid:install', [...$options, '--no-interaction' => true])
            ->expectsOutputToContain('Nama desa wajib diisi.')
            ->assertExitCode(1);

        $this->assertNothingInstalled();
    }

    public function test_install_asks_for_missing_required_options_interactively(): void
    {
        $this->artisan('sid:install', ['--district' => 'Cibadak'])
            ->expectsQuestion('Nama desa', 'Desa Sukamaju')
            ->expectsQuestion('Kode desa (10 digit Kemendagri)', '3201010001')
            ->expectsQuestion('NIK Staf SIDUTama', '3201014403850002')
            ->expectsQuestion('Nama lengkap Staf SIDUTama', 'Siti Aminah')
            ->expectsQuestion('Tanggal lahir Staf SIDUTama (YYYY-MM-DD)', '1985-03-04')
            ->expectsQuestion('Jenis kelamin Staf SIDUTama (L/P)', 'p')
            ->expectsQuestion('Alamat Staf SIDUTama', 'Jalan Desa')
            ->assertExitCode(0);

        $this->assertSame('Desa Sukamaju', Village::query()->sole()->name);
        $this->assertSame('P', User::query()->sole()->citizen->gender);
    }

    public function test_install_works_in_production(): void
    {
        $this->app['env'] = 'production';

        $this->artisan('sid:install', $this->installOptions())->assertExitCode(0);

        $this->assertSame(1, Village::query()->count());
        $this->assertSame(1, Citizen::query()->count());
        $this->assertTrue(LetterType::query()->exists());
    }

    private function installOptions(): array
    {
        return [
            '--village-name' => 'Desa Sukamaju',
            '--village-code' => '3201010001',
            '--district' => 'Cibadak',
            '--regency' => 'Sukabumi',
            '--nik' => '3201014403850002',
            '--name' => 'Siti Aminah',
            '--dob' => '1985-03-04',
            '--gender' => 'P',
            '--address' => 'Jalan Desa',
        ];
    }

    private function assertNothingInstalled(): void
    {
        $this->assertSame(0, Village::query()->count());
        $this->assertSame(0, Citizen::query()->count());
        $this->assertSame(0, User::query()->count());
    }
}
