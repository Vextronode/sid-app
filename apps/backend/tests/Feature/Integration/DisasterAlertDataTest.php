<?php

namespace Tests\Feature\Integration;

use App\Enums\DisasterAlertLevel;
use App\Enums\DisasterAlertStatus;
use App\Models\DisasterAlert;
use App\Models\IntegrationClient;
use App\Models\Village;
use App\Services\DisasterAlertService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Data peringatan bencana SIGAP (langkah 1): keadaan tampil, urutan, dan
 * pembersihan setelah masa simpan.
 */
class DisasterAlertDataTest extends TestCase
{
    use RefreshDatabase;

    private Village $village;

    private IntegrationClient $sigap;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        $this->sigap = IntegrationClient::factory()->sigap()->create(['village_id' => $this->village->id]);
    }

    public function test_level_rank_follows_info_waspada_siaga_awas(): void
    {
        $this->assertSame(
            ['info' => 1, 'waspada' => 2, 'siaga' => 3, 'awas' => 4],
            collect(DisasterAlertLevel::cases())->mapWithKeys(fn (DisasterAlertLevel $level) => [$level->value => $level->rank()])->all(),
        );
    }

    public function test_displayed_scope_excludes_ended_dismissed_and_expired_alerts(): void
    {
        $active = $this->alert();
        $this->alert(state: 'ended');
        $this->alert(state: 'dismissed');
        $this->alert(state: 'expired');

        $this->assertSame([$active->id], DisasterAlert::query()->displayed()->pluck('id')->all());
    }

    public function test_status_prefers_ended_then_dismissed_then_expired(): void
    {
        $this->assertSame(DisasterAlertStatus::Active, $this->alert()->status);
        $this->assertSame(DisasterAlertStatus::Expired, $this->alert(state: 'expired')->status);
        $this->assertSame(DisasterAlertStatus::Dismissed, $this->alert(['expires_at' => now()->subMinute()], 'dismissed')->status);
        $this->assertSame(DisasterAlertStatus::Ended, $this->alert(['dismissed_at' => now()], 'ended')->status);
        $this->assertTrue($this->alert()->isDisplayed());

        // Status dihitung ulang setelah model yang sama diubah.
        $alert = $this->alert();
        $this->assertSame(DisasterAlertStatus::Active, $alert->status);
        $alert->update(['dismissed_at' => now()]);
        $this->assertSame(DisasterAlertStatus::Dismissed, $alert->status);
    }

    public function test_displayed_alerts_are_ordered_by_level_then_newest_and_scoped_to_the_village(): void
    {
        $olderAwas = $this->alert(['sent_at' => now()->subHour()], level: DisasterAlertLevel::Awas);
        $info = $this->alert(['sent_at' => now()->subMinute()], level: DisasterAlertLevel::Info);
        $newerAwas = $this->alert(['sent_at' => now()->subMinutes(2)], level: DisasterAlertLevel::Awas);
        $siaga = $this->alert(level: DisasterAlertLevel::Siaga);

        $otherVillage = IntegrationClient::factory()->sigap()->create();
        DisasterAlert::factory()->level(DisasterAlertLevel::Awas)->create(['integration_client_id' => $otherVillage->id]);

        $this->assertSame(
            [$newerAwas->id, $olderAwas->id, $siaga->id, $info->id],
            app(DisasterAlertService::class)->displayedForVillage($this->village->id)->pluck('id')->all(),
        );
    }

    public function test_prune_only_removes_alerts_past_the_retention_period(): void
    {
        $oldExpired = $this->alert(['expires_at' => now()->subDays(31)]);
        $oldEnded = $this->alert(['ended_at' => now()->subDays(31), 'expires_at' => now()->subDays(29)]);
        $recentEnded = $this->alert(['ended_at' => now()->subDays(29)]);
        $recentExpired = $this->alert(['expires_at' => now()->subDays(29)]);
        $active = $this->alert();

        $this->artisan('disaster-alerts:prune')
            ->expectsOutputToContain('Peringatan bencana lama dihapus: 2.')
            ->assertExitCode(0);

        $this->assertModelMissing($oldExpired);
        $this->assertModelMissing($oldEnded);
        $this->assertModelExists($recentEnded);
        $this->assertModelExists($recentExpired);
        $this->assertModelExists($active);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function alert(array $attributes = [], ?string $state = null, DisasterAlertLevel $level = DisasterAlertLevel::Waspada): DisasterAlert
    {
        $factory = DisasterAlert::factory()->level($level);
        $factory = $state === null ? $factory : $factory->{$state}();

        return $factory->create(['integration_client_id' => $this->sigap->id, ...$attributes]);
    }
}
