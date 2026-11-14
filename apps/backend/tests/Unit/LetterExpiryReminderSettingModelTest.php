<?php

namespace Tests\Unit;

use App\Models\LetterExpiryReminderSetting;
use App\Models\Village;
use Database\Seeders\LetterExpiryReminderSettingSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LetterExpiryReminderSettingModelTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function table_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('letter_expiry_reminder_settings', [
            'id',
            'village_id',
            'days_before',
            'is_active',
            'activated_at',
            'created_at',
            'updated_at',
        ]));
    }

    #[Test]
    public function is_active_defaults_to_true_and_activated_at_is_nullable(): void
    {
        $setting = LetterExpiryReminderSetting::query()->create([
            'village_id' => Village::factory()->create()->id,
            'days_before' => 7,
        ])->fresh();

        $this->assertTrue($setting->is_active);
        $this->assertNull($setting->activated_at);
        $this->assertSame(7, $setting->days_before);
    }

    #[Test]
    public function unique_constraint_on_village_and_days_before_is_enforced(): void
    {
        $this->assertTrue(Schema::hasIndex(
            'letter_expiry_reminder_settings',
            'uq_letter_expiry_reminder_settings_village_days',
            'unique',
        ));

        $village = Village::factory()->create();
        LetterExpiryReminderSetting::factory()->create(['village_id' => $village->id, 'days_before' => 7]);

        $this->expectException(QueryException::class);

        LetterExpiryReminderSetting::factory()->create(['village_id' => $village->id, 'days_before' => 7]);
    }

    #[Test]
    public function same_days_before_is_allowed_across_villages(): void
    {
        LetterExpiryReminderSetting::factory()->create(['days_before' => 7]);
        LetterExpiryReminderSetting::factory()->create(['days_before' => 7]);

        $this->assertDatabaseCount('letter_expiry_reminder_settings', 2);
    }

    #[Test]
    public function settings_are_deleted_with_their_village(): void
    {
        $setting = LetterExpiryReminderSetting::factory()->create();

        $setting->village->delete();

        $this->assertDatabaseMissing('letter_expiry_reminder_settings', ['id' => $setting->id]);
    }

    #[Test]
    public function seeder_creates_five_active_points_per_village_and_is_idempotent(): void
    {
        $this->travelTo(now()->startOfMinute());
        $villages = Village::factory()->count(2)->create();

        $this->seed(LetterExpiryReminderSettingSeeder::class);
        $this->seed(LetterExpiryReminderSettingSeeder::class);

        $this->assertDatabaseCount('letter_expiry_reminder_settings', 10);

        foreach ($villages as $village) {
            $settings = LetterExpiryReminderSetting::query()
                ->where('village_id', $village->id)
                ->orderByDesc('days_before')
                ->get();

            $this->assertSame([30, 14, 7, 3, 1], $settings->pluck('days_before')->all());
            $this->assertTrue($settings->every->is_active);
            $this->assertTrue($settings->every(fn ($s) => $s->activated_at?->equalTo(now())));
        }
    }
}
