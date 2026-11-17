<?php

namespace Tests\Feature\Integration;

use App\Enums\DisasterAlertLevel;
use App\Models\DisasterAlert;
use App\Models\IntegrationClient;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * GET /api/public/disaster-alerts untuk bar merah halaman publik (langkah 4).
 */
class DisasterAlertPublicEndpointTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/public/disaster-alerts';

    private Village $village;

    private IntegrationClient $sigap;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        $this->sigap = IntegrationClient::factory()->sigap()->create(['village_id' => $this->village->id]);
    }

    public function test_only_displayed_alerts_are_returned_highest_level_first_without_staff_fields(): void
    {
        $waspada = $this->alert(DisasterAlertLevel::Waspada, ['sent_at' => now()->subMinute()]);
        $awas = $this->alert(DisasterAlertLevel::Awas, [
            'type' => 'tsunami',
            'title' => 'Peringatan dini tsunami',
            'link_url' => 'https://sigap.example.id/kejadian/882',
            'sent_at' => now()->subHour(),
        ]);
        $this->alert(DisasterAlertLevel::Awas, ['dismissed_at' => now(), 'dismiss_reason' => 'Alarm palsu.']);
        $this->alert(DisasterAlertLevel::Awas, ['ended_at' => now()]);
        $this->alert(DisasterAlertLevel::Awas, ['expires_at' => now()->subMinute()]);

        $response = $this->getJson(self::URL)
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $awas->id)
            ->assertJsonPath('data.1.id', $waspada->id);

        $this->assertSame([
            'id' => $awas->id,
            'type' => 'tsunami',
            'type_label' => 'Tsunami',
            'level' => 'awas',
            'level_label' => 'Awas',
            'title' => 'Peringatan dini tsunami',
            'message' => $awas->message,
            'magnitude' => 5.2,
            // JSON menulis 10.0 sebagai 10.
            'depth_km' => 10,
            'location' => $awas->location,
            'link_url' => 'https://sigap.example.id/kejadian/882',
            'occurred_at' => $awas->fresh()->occurred_at->toIso8601String(),
            'expires_at' => $awas->fresh()->expires_at->toIso8601String(),
        ], $response->json('data.0'));

        $this->assertStringNotContainsString('Alarm palsu', $response->getContent());
        $this->assertStringNotContainsString('dismiss', $response->getContent());
    }

    public function test_alerts_from_another_village_are_not_returned(): void
    {
        $other = Village::factory()->create();
        $otherClient = IntegrationClient::factory()->sigap()->create(['village_id' => $other->id]);
        DisasterAlert::factory()->create(['integration_client_id' => $otherClient->id]);
        $mine = $this->alert(DisasterAlertLevel::Info);

        $this->getJson(self::URL.'?village_code='.$this->village->code)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id);
    }

    public function test_changes_are_visible_immediately_without_waiting_for_a_cache(): void
    {
        $this->getJson(self::URL.'?village_code='.$this->village->code)->assertJsonCount(0, 'data');

        $alert = $this->alert(DisasterAlertLevel::Awas, ['expires_at' => now()->addMinutes(2)]);
        $this->getJson(self::URL.'?village_code='.$this->village->code)->assertJsonCount(1, 'data');

        // Kedaluwarsa karena waktu, tanpa ada data yang berubah.
        Carbon::setTestNow(now()->addMinutes(3));
        $this->getJson(self::URL.'?village_code='.$this->village->code)->assertJsonCount(0, 'data');
        Carbon::setTestNow();

        $alert->update(['expires_at' => now()->addHour(), 'dismissed_at' => now()]);
        $this->getJson(self::URL.'?village_code='.$this->village->code)->assertJsonCount(0, 'data');
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function alert(DisasterAlertLevel $level, array $attributes = []): DisasterAlert
    {
        return DisasterAlert::factory()->level($level)->create([
            'integration_client_id' => $this->sigap->id,
            ...$attributes,
        ]);
    }
}
