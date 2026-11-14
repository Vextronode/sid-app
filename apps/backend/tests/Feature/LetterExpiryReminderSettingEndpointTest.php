<?php

namespace Tests\Feature;

use App\Models\LetterExpiryReminderSetting;
use App\Models\User;
use App\Models\Village;
use Database\Seeders\LetterExpiryReminderSettingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * GET /letter-expiry-reminder-settings,
 * PATCH /letter-expiry-reminder-settings/{id}, dan
 * PATCH /letter-expiry-reminder-settings/send-at.
 */
class LetterExpiryReminderSettingEndpointTest extends TestCase
{
    use RefreshDatabase;

    private Village $village;

    private User $staf;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-11-01 10:00', 'Asia/Jakarta'));

        $this->village = Village::factory()->create();
        $this->staf = User::factory()->create(['village_id' => $this->village->id, 'role' => 'staf_sid']);
        $this->seed(LetterExpiryReminderSettingSeeder::class);
    }

    private function point(int $daysBefore, ?Village $village = null): LetterExpiryReminderSetting
    {
        return LetterExpiryReminderSetting::query()
            ->where('village_id', ($village ?? $this->village)->id)
            ->where('days_before', $daysBefore)
            ->firstOrFail();
    }

    public function test_guest_is_rejected(): void
    {
        $this->getJson('/api/letter-expiry-reminder-settings')->assertUnauthorized();
    }

    public function test_roles_other_than_staf_sid_are_forbidden(): void
    {
        $setting = $this->point(7);

        foreach (['warga', 'rt', 'kepala_desa', 'sekretaris_desa'] as $role) {
            $user = User::factory()->create(['village_id' => $this->village->id, 'role' => $role]);

            $this->actingAs($user)
                ->getJson('/api/letter-expiry-reminder-settings')
                ->assertForbidden();

            $this->actingAs($user)
                ->patchJson("/api/letter-expiry-reminder-settings/{$setting->id}", ['is_active' => false])
                ->assertForbidden();

            $this->actingAs($user)
                ->patchJson('/api/letter-expiry-reminder-settings/send-at', ['send_at' => '16:00'])
                ->assertForbidden();
        }

        $this->assertTrue($setting->fresh()->is_active);
        $this->assertSame('09:00', $this->village->fresh()->expiryReminderSendTime());
    }

    public function test_new_village_defaults_to_nine_oclock_send_time(): void
    {
        $this->assertTrue(Schema::hasColumn('villages', 'expiry_reminder_send_at'));
        $this->assertSame('09:00', Village::factory()->create()->fresh()->expiryReminderSendTime());

        $options = array_map(fn (int $hour) => sprintf('%02d:00', $hour), range(6, 21));

        $this->actingAs($this->staf)
            ->getJson('/api/letter-expiry-reminder-settings')
            ->assertOk()
            ->assertJsonPath('meta.send_at', '09:00')
            ->assertJsonPath('meta.send_at_options', $options);
    }

    public function test_patch_send_at_updates_own_village_only(): void
    {
        $otherVillage = Village::factory()->create();

        $this->actingAs($this->staf)
            ->patchJson('/api/letter-expiry-reminder-settings/send-at', ['send_at' => '16:00'])
            ->assertOk()
            ->assertJsonPath('data.send_at', '16:00');

        $this->assertSame('16:00', $this->village->fresh()->expiryReminderSendTime());
        $this->assertSame('09:00', $otherVillage->fresh()->expiryReminderSendTime());

        $this->actingAs($this->staf)
            ->getJson('/api/letter-expiry-reminder-settings')
            ->assertJsonPath('meta.send_at', '16:00');
    }

    public function test_send_at_must_be_a_whole_hour_within_allowed_range(): void
    {
        foreach (['16:30', '05:00', '22:00', '6:00', '25:00', 'pagi', '', null] as $invalid) {
            $this->actingAs($this->staf)
                ->patchJson('/api/letter-expiry-reminder-settings/send-at', ['send_at' => $invalid])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['send_at']);
        }

        $this->assertSame('09:00', $this->village->fresh()->expiryReminderSendTime());

        foreach (['06:00', '21:00'] as $edge) {
            $this->actingAs($this->staf)
                ->patchJson('/api/letter-expiry-reminder-settings/send-at', ['send_at' => $edge])
                ->assertOk()
                ->assertJsonPath('data.send_at', $edge);
        }
    }

    public function test_send_at_rejects_other_fields(): void
    {
        $this->actingAs($this->staf)
            ->patchJson('/api/letter-expiry-reminder-settings/send-at', [
                'send_at' => '16:00',
                'name' => 'Desa Lain',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);

        $this->assertSame('09:00', $this->village->fresh()->expiryReminderSendTime());
    }

    public function test_send_time_is_not_exposed_in_public_village_profile(): void
    {
        $this->getJson('/api/public/village-profile')
            ->assertOk()
            ->assertJsonMissingPath('data.expiry_reminder_send_at');
    }

    public function test_index_lists_five_points_of_own_village_from_farthest(): void
    {
        $otherVillage = Village::factory()->create();
        $this->seed(LetterExpiryReminderSettingSeeder::class);

        $this->actingAs($this->staf)
            ->getJson('/api/letter-expiry-reminder-settings')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('data.*.days_before', [30, 14, 7, 3, 1])
            ->assertJsonPath('data.0.id', $this->point(30)->id)
            ->assertJsonPath('data.0.is_active', true)
            ->assertJsonStructure(['data' => [['id', 'days_before', 'is_active', 'activated_at']]]);

        $this->assertNotNull($this->point(30, $otherVillage));
    }

    public function test_patch_toggles_is_active(): void
    {
        $setting = $this->point(3);

        $this->actingAs($this->staf)
            ->patchJson("/api/letter-expiry-reminder-settings/{$setting->id}", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.id', $setting->id)
            ->assertJsonPath('data.is_active', false);

        $this->assertFalse($setting->fresh()->is_active);
    }

    public function test_activated_at_changes_only_when_point_is_turned_on(): void
    {
        $setting = $this->point(14);
        $seededAt = $setting->activated_at;

        $this->travel(1)->days();
        $this->actingAs($this->staf)
            ->patchJson("/api/letter-expiry-reminder-settings/{$setting->id}", ['is_active' => false])
            ->assertOk();
        $this->assertTrue($setting->fresh()->activated_at->equalTo($seededAt));

        $this->travel(1)->days();
        $this->actingAs($this->staf)
            ->patchJson("/api/letter-expiry-reminder-settings/{$setting->id}", ['is_active' => true])
            ->assertOk();
        $turnedOnAt = now()->toImmutable();
        $this->assertTrue($setting->fresh()->activated_at->equalTo($turnedOnAt));

        // Sudah aktif: menyalakan lagi tidak menggeser activated_at.
        $this->travel(1)->days();
        $this->actingAs($this->staf)
            ->patchJson("/api/letter-expiry-reminder-settings/{$setting->id}", ['is_active' => true])
            ->assertOk();
        $this->assertTrue($setting->fresh()->activated_at->equalTo($turnedOnAt));
    }

    public function test_fields_other_than_is_active_are_rejected(): void
    {
        $setting = $this->point(7);

        $this->actingAs($this->staf)
            ->patchJson("/api/letter-expiry-reminder-settings/{$setting->id}", [
                'is_active' => false,
                'days_before' => 10,
                'activated_at' => '2020-01-01 00:00:00',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['days_before', 'activated_at']);

        $fresh = $setting->fresh();
        $this->assertTrue($fresh->is_active);
        $this->assertSame(7, $fresh->days_before);
    }

    public function test_is_active_is_required_and_boolean(): void
    {
        $setting = $this->point(7);

        $this->actingAs($this->staf)
            ->patchJson("/api/letter-expiry-reminder-settings/{$setting->id}", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['is_active']);

        $this->actingAs($this->staf)
            ->patchJson("/api/letter-expiry-reminder-settings/{$setting->id}", ['is_active' => 'ya'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['is_active']);
    }

    public function test_setting_of_another_village_is_not_found(): void
    {
        $otherVillage = Village::factory()->create();
        $this->seed(LetterExpiryReminderSettingSeeder::class);
        $foreign = $this->point(7, $otherVillage);

        $this->actingAs($this->staf)
            ->patchJson("/api/letter-expiry-reminder-settings/{$foreign->id}", ['is_active' => false])
            ->assertNotFound();

        $this->assertTrue($foreign->fresh()->is_active);
    }
}
