<?php

namespace Tests\Feature\Console;

use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PetugasCommandsTest extends TestCase
{
    use RefreshDatabase;

    public function test_petugas_first_promotes_existing_resident_account_and_audits_without_causer(): void
    {
        $village = Village::factory()->create();
        $user = $this->residentAccount($village, 'petugas.pertama');

        $this->artisan('petugas:first', ['--nik' => $user->citizen->nik])
            ->expectsOutputToContain("Akun {$user->username} berhasil")
            ->expectsOutputToContain('Password sementara')
            ->assertExitCode(0);

        $user->refresh();
        $this->assertSame('petugas_desa', $user->role);
        $this->assertTrue($user->must_change_password);
        $official = Official::query()->where('user_id', $user->id)->firstOrFail();
        $this->assertSame($user->citizen_id, $official->citizen_id);
        $this->assertSame($village->id, $official->village_id);
        $this->assertSame('petugas_desa', $official->position);
        $this->assertTrue($official->is_active);
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'official',
            'description' => 'promoted',
            'subject_id' => (string) $official->id,
            'causer_id' => null,
        ]);
    }

    public function test_petugas_first_rejects_when_an_active_petugas_already_exists(): void
    {
        User::factory()->create(['role' => 'petugas_desa', 'village_id' => Village::factory()->create()->id]);
        $village = Village::factory()->create();
        $resident = $this->residentAccount($village, 'petugas.kedua');

        $this->artisan('petugas:first', ['--nik' => $resident->citizen->nik])->assertExitCode(1);
        $this->assertSame('warga', $resident->fresh()->role);
    }

    public function test_petugas_first_creates_citizen_account_and_official_when_citizen_is_missing(): void
    {
        [$village, $rt] = $this->villageWithRt();

        $this->artisan('petugas:first', [
            '--nik' => '3201010101010001',
            '--name' => 'Budi Santoso',
            '--dob' => '1980-01-02',
            '--gender' => 'L',
            '--address' => 'Jalan Desa',
            '--village' => $village->id,
            '--rt' => $rt->id,
        ])->assertExitCode(0);

        $citizen = Citizen::query()->where('nik_hash', hash('sha256', '3201010101010001'))->firstOrFail();
        $this->assertSame($village->id, $citizen->village_id);
        $this->assertSame($rt->id, $citizen->rt_id);
        $this->assertSame('manual_input_desa', $citizen->data_source->value);
        $user = User::query()->where('citizen_id', $citizen->id)->firstOrFail();
        $this->assertSame('petugas_desa', $user->role);
        $this->assertMatchesRegularExpression('/^budi\.\d{4,5}$/', $user->username);
        $this->assertTrue($user->must_change_password);
        $this->assertNotSame('3201010101010001', $citizen->getRawOriginal('nik'));
        $this->assertDatabaseHas('officials', [
            'user_id' => $user->id,
            'position' => 'petugas_desa',
            'village_id' => $village->id,
            'is_active' => true,
        ]);
    }

    public function test_petugas_first_creates_account_for_existing_citizen_without_account(): void
    {
        $village = Village::factory()->create();
        $citizen = Citizen::factory()->create([
            'village_id' => $village->id,
            'rt_id' => null,
            'hamlet_id' => null,
        ]);

        $this->artisan('petugas:first', ['--nik' => $citizen->nik])->assertExitCode(0);

        $user = User::query()->where('citizen_id', $citizen->id)->firstOrFail();
        $this->assertSame('petugas_desa', $user->role);
        $this->assertSame($citizen->name, $user->name);
        $this->assertTrue($user->must_change_password);
    }

    private function residentAccount(Village $village, string $username): User
    {
        $citizen = Citizen::factory()->create([
            'village_id' => $village->id,
            'rt_id' => null,
            'hamlet_id' => null,
        ]);

        return User::factory()->create([
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
            'name' => $citizen->name,
            'username' => $username,
            'role' => 'warga',
        ]);
    }

    private function villageWithRt(): array
    {
        $village = Village::factory()->create();
        $hamlet = Hamlet::factory()->create(['village_id' => $village->id]);
        $rw = Rw::factory()->create(['village_id' => $village->id, 'hamlet_id' => $hamlet->id]);
        $rt = Rt::factory()->create(['village_id' => $village->id, 'rw_id' => $rw->id]);

        return [$village, $rt];
    }
}
