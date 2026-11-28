<?php

namespace Tests\Feature\Console;

use App\Enums\ApprovalLevel;
use App\Enums\LetterTypeCategory;
use App\Models\ApprovalSetting;
use App\Models\LetterExpiryReminderSetting;
use App\Models\LetterType;
use App\Models\NewsCategory;
use App\Models\Occupation;
use App\Models\Village;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SidSyncReferenceDataCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_sync_adds_new_reference_data_and_keeps_village_settings(): void
    {
        $village = $this->installedVillage();

        // Pengaturan yang diubah Staf SIDUTama setelah desa berjalan.
        $customized = LetterType::query()->where('village_id', $village->id)->where('code', 'A05')->sole();
        $customized->update([
            'category' => LetterTypeCategory::Pelayanan->value,
            'assigned_role' => LetterTypeCategory::Pelayanan->handlerRole()->value,
            'validity_days' => 7,
            'is_active' => false,
            // Struktur lama sebelum rilis baru.
            'template' => '<p>template lama</p>',
        ]);
        $rtSetting = ApprovalSetting::query()->where('village_id', $village->id)->where('approval_level', ApprovalLevel::RT->value)->sole();
        $rtSetting->update(['deadline_hours' => 48, 'reminder_hours' => 24]);
        $reminder = LetterExpiryReminderSetting::query()->where('village_id', $village->id)->orderBy('days_before')->firstOrFail();
        $reminder->update(['is_active' => false]);
        NewsCategory::query()->where('village_id', $village->id)->where('slug', 'budaya')->delete();
        $occupation = Occupation::query()->where('village_id', $village->id)->where('name', 'Pelajar/Mahasiswa')->sole();
        $occupation->update(['is_active' => false]);

        // Seolah rilis baru membawa jenis surat dan tahap persetujuan yang
        // belum ada di desa ini.
        LetterType::query()->where('village_id', $village->id)->where('code', 'A13')->delete();
        ApprovalSetting::query()->where('village_id', $village->id)->where('approval_level', ApprovalLevel::KEPALA_DESA->value)->delete();

        $this->artisan('sid:sync-reference-data')
            ->expectsOutputToContain('Jenis surat baru: A13.')
            ->expectsOutputToContain('Pengaturan desa tidak diubah')
            ->assertExitCode(0);

        $this->assertTrue(LetterType::query()->where('village_id', $village->id)->where('code', 'A13')->where('is_active', true)->exists());

        $customized->refresh();
        $this->assertSame(LetterTypeCategory::Pelayanan, $customized->category);
        $this->assertSame(LetterTypeCategory::Pelayanan->handlerRole()->value, $customized->assigned_role);
        $this->assertSame(7, $customized->validity_days);
        $this->assertFalse($customized->is_active);
        $this->assertNotSame('<p>template lama</p>', $customized->template);

        $rtSetting->refresh();
        $this->assertSame([48, 24], [$rtSetting->deadline_hours, $rtSetting->reminder_hours]);
        $this->assertTrue(ApprovalSetting::query()->where('village_id', $village->id)->where('approval_level', ApprovalLevel::KEPALA_DESA->value)->exists());
        $this->assertFalse($reminder->fresh()->is_active);

        // Katalog milik desa tidak disentuh: bawaan yang dihapus/dinonaktifkan tetap begitu.
        $this->assertFalse(NewsCategory::query()->where('village_id', $village->id)->where('slug', 'budaya')->exists());
        $this->assertFalse($occupation->fresh()->is_active);
    }

    public function test_sync_reports_no_new_letter_types_when_up_to_date(): void
    {
        $village = $this->installedVillage();
        $count = LetterType::query()->where('village_id', $village->id)->count();

        $this->artisan('sid:sync-reference-data')
            ->expectsOutputToContain('Tidak ada jenis surat baru.')
            ->assertExitCode(0);

        $this->assertSame($count, LetterType::query()->where('village_id', $village->id)->count());
    }

    public function test_sync_requires_an_installed_village(): void
    {
        $this->artisan('sid:sync-reference-data')
            ->expectsOutputToContain('sid:install')
            ->assertExitCode(1);

        $this->assertSame(0, LetterType::query()->count());
    }

    public function test_sync_runs_in_production_with_force(): void
    {
        $village = $this->installedVillage();
        LetterType::query()->where('village_id', $village->id)->where('code', 'A13')->delete();
        $this->app['env'] = 'production';

        $this->artisan('sid:sync-reference-data', ['--force' => true])
            ->expectsOutputToContain('Jenis surat baru: A13.')
            ->assertExitCode(0);
    }

    private function installedVillage(): Village
    {
        $village = Village::factory()->create();
        $this->seed(ReferenceDataSeeder::class);

        return $village;
    }
}
