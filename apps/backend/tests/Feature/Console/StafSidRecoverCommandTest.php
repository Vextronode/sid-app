<?php

namespace Tests\Feature\Console;

use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * A-18. staf-sid:recover mereset kata sandi staf_sid aktif saja.
 */
class StafSidRecoverCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_recover_resets_password_revokes_sessions_and_logs_activity(): void
    {
        config(['session.driver' => 'database']);
        $staf = $this->makeUserWithOfficialAssignment('staf_sid', 'staf_sid', Village::factory()->create()->id);
        $staf->update(['username' => 'staf.desa', 'password' => 'lama-sekali', 'must_change_password' => false]);
        $staf->createToken('lama');
        DB::table('sessions')->insert([
            'id' => 'sesi-lama',
            'user_id' => $staf->id,
            'payload' => '',
            'last_activity' => now()->timestamp,
        ]);

        $this->artisan('staf-sid:recover', ['--username' => 'STAF.DESA', '--force' => true])
            ->expectsOutputToContain('berhasil direset')
            ->expectsOutputToContain('Password sementara')
            ->assertSuccessful();

        $staf->refresh();
        $this->assertFalse(Hash::check('lama-sekali', $staf->password));
        $this->assertTrue($staf->must_change_password);
        $this->assertSame(0, $staf->tokens()->count());
        $this->assertDatabaseMissing('sessions', ['id' => 'sesi-lama']);
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'user',
            'event' => 'staf_sid_recovered',
            'subject_id' => $staf->id,
            'causer_id' => null,
        ]);
    }

    public function test_recover_asks_for_confirmation_and_can_be_cancelled(): void
    {
        $staf = $this->makeUserWithOfficialAssignment('staf_sid', 'staf_sid', Village::factory()->create()->id);
        $staf->update(['username' => 'staf.desa', 'password' => 'lama-sekali']);

        $this->artisan('staf-sid:recover', ['--username' => 'staf.desa'])
            ->expectsConfirmation('Reset kata sandi Staf SIDUTama "staf.desa"? Semua sesi akun ini akan keluar.', 'no')
            ->assertFailed();

        $this->assertTrue(Hash::check('lama-sekali', $staf->fresh()->password));
    }

    public function test_recover_rejects_unknown_non_staf_and_inactive_accounts(): void
    {
        $village = Village::factory()->create();
        $warga = User::factory()->create(['role' => 'warga', 'username' => 'warga.biasa', 'password' => 'lama-sekali']);
        $inactive = $this->makeUserWithOfficialAssignment('staf_sid', 'staf_sid', $village->id);
        $inactive->update(['username' => 'staf.nonaktif', 'password' => 'lama-sekali', 'is_active' => false]);

        $this->artisan('staf-sid:recover', ['--username' => 'tidak.ada', '--force' => true])
            ->expectsOutputToContain('tidak ditemukan')
            ->assertFailed();
        $this->artisan('staf-sid:recover', ['--username' => 'warga.biasa', '--force' => true])
            ->expectsOutputToContain('bukan')
            ->assertFailed();
        $this->artisan('staf-sid:recover', ['--username' => 'staf.nonaktif', '--force' => true])
            ->expectsOutputToContain('tidak aktif')
            ->assertFailed();
        $this->artisan('staf-sid:recover', ['--force' => true])->assertFailed();

        $this->assertTrue(Hash::check('lama-sekali', $warga->fresh()->password));
        $this->assertTrue(Hash::check('lama-sekali', $inactive->fresh()->password));
        $this->assertDatabaseMissing('activity_log', ['event' => 'staf_sid_recovered']);
    }
}
