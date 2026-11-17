<?php

namespace Tests\Feature\Integration;

use App\Enums\DisasterAlertLevel;
use App\Models\DisasterAlert;
use App\Models\IntegrationClient;
use App\Models\User;
use App\Models\Village;
use App\Notifications\DisasterAlertNotification;
use App\Services\DisasterAlertService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

/**
 * Tab Peringatan SIGAP untuk Staf SIDUTama (langkah 5): daftar, turunkan
 * dengan alasan, dan tampilkan lagi.
 */
class DisasterAlertManagementTest extends TestCase
{
    use RefreshDatabase;

    private Village $village;

    private IntegrationClient $sigap;

    private User $staf;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        $this->sigap = IntegrationClient::factory()->sigap()->create(['village_id' => $this->village->id]);
        $this->staf = $this->makeStafSidActor($this->village->id);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function otherRoles(): array
    {
        return [
            'warga' => ['warga'],
            'kepala_desa' => ['kepala_desa'],
            'kaur_tu_umum' => ['kaur_tu_umum'],
            'rt' => ['rt'],
        ];
    }

    #[DataProvider('otherRoles')]
    public function test_only_staf_sid_can_manage_alerts(string $role): void
    {
        $alert = $this->alert();
        $user = User::factory()->create(['village_id' => $this->village->id, 'role' => $role]);

        $this->actingAs($user, 'web')->getJson('/api/disaster-alerts')->assertForbidden();
        $this->actingAs($user, 'web')->postJson("/api/disaster-alerts/{$alert->id}/dismiss", ['reason' => 'x'])->assertForbidden();
        $this->actingAs($user, 'web')->postJson("/api/disaster-alerts/{$alert->id}/restore")->assertForbidden();
        $this->assertNull($alert->fresh()->dismissed_at);
    }

    public function test_alerts_of_another_village_are_hidden_and_cannot_be_changed(): void
    {
        $otherClient = IntegrationClient::factory()->sigap()->create();
        $foreign = DisasterAlert::factory()->create(['integration_client_id' => $otherClient->id]);

        $this->actingAs($this->staf, 'web')->getJson('/api/disaster-alerts')->assertJsonCount(0, 'data');
        $this->actingAs($this->staf, 'web')
            ->postJson("/api/disaster-alerts/{$foreign->id}/dismiss", ['reason' => 'Alarm palsu.'])
            ->assertNotFound();
        $this->actingAs($this->staf, 'web')->postJson('/api/disaster-alerts/bukan-uuid/dismiss', ['reason' => 'x'])->assertNotFound();
    }

    public function test_lists_displayed_and_dismissed_alerts(): void
    {
        $info = $this->alert(DisasterAlertLevel::Info);
        $awas = $this->alert(DisasterAlertLevel::Awas);
        $dismissed = $this->alert(DisasterAlertLevel::Siaga, [
            'dismissed_at' => now(),
            'dismissed_by' => $this->staf->id,
            'dismiss_reason' => 'Alarm palsu.',
        ]);
        // Diturunkan tetapi sudah berakhir atau kedaluwarsa: tidak bisa ditampilkan lagi.
        $this->alert(DisasterAlertLevel::Siaga, ['dismissed_at' => now(), 'ended_at' => now()]);
        $this->alert(DisasterAlertLevel::Siaga, ['dismissed_at' => now(), 'expires_at' => now()->subMinute()]);

        $this->actingAs($this->staf, 'web')->getJson('/api/disaster-alerts')
            ->assertOk()
            ->assertJsonPath('data.*.id', [$awas->id, $info->id])
            ->assertJsonPath('data.0.status', 'active')
            ->assertJsonPath('data.0.source', 'SIGAP');

        $this->actingAs($this->staf, 'web')->getJson('/api/disaster-alerts?status=dismissed')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $dismissed->id)
            ->assertJsonPath('data.0.status', 'dismissed')
            ->assertJsonPath('data.0.dismiss_reason', 'Alarm palsu.')
            ->assertJsonPath('data.0.dismissed_by.name', $this->staf->name);

        $this->actingAs($this->staf, 'web')->getJson('/api/disaster-alerts?status=ended')->assertUnprocessable();
    }

    public function test_dismiss_requires_a_reason_and_hides_the_alert_from_the_public_page(): void
    {
        $alert = $this->alert(DisasterAlertLevel::Awas);

        $this->actingAs($this->staf, 'web')
            ->postJson("/api/disaster-alerts/{$alert->id}/dismiss", ['reason' => '  '])
            ->assertUnprocessable()
            ->assertJsonPath('errors.reason.0', 'Alasan menurunkan peringatan wajib diisi.');

        $this->actingAs($this->staf, 'web')
            ->postJson("/api/disaster-alerts/{$alert->id}/dismiss", ['reason' => 'Alarm palsu,   dikonfirmasi BPBD.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'dismissed')
            ->assertJsonPath('data.dismiss_reason', 'Alarm palsu, dikonfirmasi BPBD.')
            ->assertJsonPath('data.dismissed_by.id', $this->staf->id);

        $this->getJson('/api/public/disaster-alerts')->assertJsonCount(0, 'data');

        $activity = Activity::query()->where('log_name', 'disaster_alert')->where('event', 'dismissed')->sole();
        $this->assertSame($this->staf->id, $activity->causer_id);
        $this->assertSame($alert->id, $activity->subject_id);
        $this->assertSame('Alarm palsu, dikonfirmasi BPBD.', $activity->properties['reason']);
        $this->assertSame($this->village->id, $activity->properties['village_id']);
    }

    public function test_dismiss_rejects_alerts_that_are_not_displayed(): void
    {
        foreach ([['ended_at' => now()], ['expires_at' => now()->subMinute()], ['dismissed_at' => now()]] as $state) {
            $alert = $this->alert(DisasterAlertLevel::Awas, $state);

            $this->actingAs($this->staf, 'web')
                ->postJson("/api/disaster-alerts/{$alert->id}/dismiss", ['reason' => 'Alarm palsu.'])
                ->assertStatus(409);
        }
    }

    public function test_restore_shows_the_alert_again_without_notifying(): void
    {
        Notification::fake();
        $alert = $this->alert(DisasterAlertLevel::Awas, [
            'dismissed_at' => now(),
            'dismissed_by' => $this->staf->id,
            'dismiss_reason' => 'Salah turunkan.',
            'notified_level_rank' => null,
        ]);

        $this->actingAs($this->staf, 'web')
            ->postJson("/api/disaster-alerts/{$alert->id}/restore")
            ->assertOk()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.dismiss_reason', null);

        $this->getJson('/api/public/disaster-alerts')->assertJsonPath('data.0.id', $alert->id);
        Notification::assertNothingSent();
        $this->assertDatabaseHas('activity_log', [
            'log_name' => 'disaster_alert',
            'event' => 'restored',
            'subject_id' => $alert->id,
            'causer_id' => $this->staf->id,
        ]);
    }

    public function test_restore_rejects_ended_expired_or_displayed_alerts(): void
    {
        $states = [
            ['dismissed_at' => now(), 'ended_at' => now()],
            ['dismissed_at' => now(), 'expires_at' => now()->subMinute()],
            [],
        ];

        foreach ($states as $state) {
            $alert = $this->alert(DisasterAlertLevel::Awas, $state);

            $this->actingAs($this->staf, 'web')
                ->postJson("/api/disaster-alerts/{$alert->id}/restore")
                ->assertStatus(409);
        }
    }

    public function test_sigap_updates_keep_a_dismissed_alert_hidden_until_restored(): void
    {
        Notification::fake();
        $alert = $this->alert(DisasterAlertLevel::Waspada);

        $this->actingAs($this->staf, 'web')
            ->postJson("/api/disaster-alerts/{$alert->id}/dismiss", ['reason' => 'Alarm palsu.'])
            ->assertOk();

        app(DisasterAlertService::class)->upsertFromSigap($this->sigap, $alert->external_id, [
            'type' => 'gempa',
            'level' => 'awas',
            'title' => 'Level naik',
            'occurred_at' => now()->toIso8601String(),
            'sent_at' => now()->addMinute()->toIso8601String(),
        ]);

        $this->getJson('/api/public/disaster-alerts')->assertJsonCount(0, 'data');
        Notification::assertNotSentTo($this->staf, DisasterAlertNotification::class);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function alert(DisasterAlertLevel $level = DisasterAlertLevel::Waspada, array $attributes = []): DisasterAlert
    {
        return DisasterAlert::factory()->level($level)->create([
            'integration_client_id' => $this->sigap->id,
            ...$attributes,
        ]);
    }
}
