<?php

namespace Tests\Feature\Integration;

use App\Enums\IntegrationAbility;
use App\Models\IntegrationClient;
use App\Models\User;
use App\Models\Village;
use App\Services\IntegrationClientService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

/**
 * Menu Integrasi Staf SIDUTama (langkah 6): enable/disable, rotate, dan
 * cabut token dengan konfirmasi kata sandi.
 */
class IntegrationClientEndpointTest extends TestCase
{
    use RefreshDatabase;

    private Village $village;

    private User $staf;

    private IntegrationClient $client;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        $this->staf = $this->makeStafSidActor($this->village->id);
        ['client' => $this->client, 'token' => $this->token] = app(IntegrationClientService::class)->create(
            'cimart',
            'Cimart',
            [IntegrationAbility::SellerApplicationsRead->value, IntegrationAbility::SellerApplicationsUpdate->value],
            $this->village->id,
        );
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
            'kasi_pemerintahan' => ['kasi_pemerintahan'],
        ];
    }

    #[DataProvider('otherRoles')]
    public function test_only_staf_sid_can_open_the_integration_menu(string $role): void
    {
        $user = User::factory()->create(['village_id' => $this->village->id, 'role' => $role]);

        $this->actingAs($user, 'web')->getJson('/api/integration-clients')->assertForbidden();
        $this->actingAs($user, 'web')->postJson("/api/integration-clients/{$this->client->id}/tokens", ['password' => 'Password123'])->assertForbidden();
    }

    public function test_list_shows_clients_abilities_and_token_metadata_without_token_values(): void
    {
        $response = $this->actingAs($this->staf, 'web')->getJson('/api/integration-clients')
            ->assertOk()
            ->assertJsonPath('data.0.slug', 'cimart')
            ->assertJsonPath('data.0.name', 'Cimart')
            ->assertJsonPath('data.0.is_active', true)
            ->assertJsonPath('data.0.abilities.0', [
                'value' => 'seller-applications:read',
                'label' => 'Membaca permohonan pedagang',
            ])
            ->assertJsonCount(1, 'data.0.tokens')
            ->assertJsonStructure(['data' => [['tokens' => [['id', 'name', 'created_at', 'last_used_at']]]]]);

        $this->assertStringNotContainsString(explode('|', $this->token, 2)[1], $response->getContent());
    }

    public function test_clients_of_another_village_are_hidden(): void
    {
        $other = IntegrationClient::factory()->create(['village_id' => Village::factory()->create()->id]);

        $this->actingAs($this->staf, 'web')->getJson('/api/integration-clients')->assertJsonCount(1, 'data');
        $this->actingAs($this->staf, 'web')
            ->patchJson("/api/integration-clients/{$other->id}/status", ['is_active' => false])
            ->assertNotFound();
        $this->actingAs($this->staf, 'web')
            ->postJson("/api/integration-clients/{$other->id}/tokens", ['password' => 'Password123'])
            ->assertNotFound();
    }

    public function test_disable_needs_no_password_but_enable_does(): void
    {
        $this->actingAs($this->staf, 'web')
            ->patchJson("/api/integration-clients/{$this->client->id}/status", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        Auth::forgetGuards();
        $this->withToken($this->token)->getJson('/api/integrations/v1/ping')
            ->assertForbidden()
            ->assertJson(['code' => 'integration_disabled']);

        $this->actingAs($this->staf, 'web')
            ->patchJson("/api/integration-clients/{$this->client->id}/status", ['is_active' => true])
            ->assertUnprocessable()
            ->assertJsonPath('errors.password.0', 'Masukkan kata sandi Anda untuk melanjutkan.');

        $this->actingAs($this->staf, 'web')
            ->patchJson("/api/integration-clients/{$this->client->id}/status", ['is_active' => true, 'password' => 'salah'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.password.0', 'Kata sandi tidak sesuai.');

        $this->actingAs($this->staf, 'web')
            ->patchJson("/api/integration-clients/{$this->client->id}/status", ['is_active' => true, 'password' => 'Password123'])
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->assertSame(['client_disabled', 'client_enabled'], $this->staffEvents(['client_disabled', 'client_enabled']));
    }

    public function test_rotate_requires_password_and_returns_the_token_only_once(): void
    {
        $this->actingAs($this->staf, 'web')
            ->postJson("/api/integration-clients/{$this->client->id}/tokens", ['password' => 'salah'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $token = $this->actingAs($this->staf, 'web')
            ->postJson("/api/integration-clients/{$this->client->id}/tokens", ['password' => 'Password123'])
            ->assertOk()
            ->assertJsonCount(2, 'data.tokens')
            ->json('token');

        $this->assertIsString($token);
        Auth::forgetGuards();
        $this->withToken($token)->getJson('/api/integrations/v1/ping')->assertOk();
        // Token lama tetap berlaku setelah rotate.
        Auth::forgetGuards();
        $this->withToken($this->token)->getJson('/api/integrations/v1/ping')->assertOk();

        Auth::forgetGuards();
        $list = $this->actingAs($this->staf, 'web')->getJson('/api/integration-clients')->assertOk();
        $this->assertArrayNotHasKey('token', $list->json());
        $this->assertStringNotContainsString(explode('|', $token, 2)[1], $list->getContent());
    }

    public function test_revoke_requires_password_and_rejects_the_token_immediately(): void
    {
        $tokenId = explode('|', $this->token, 2)[0];

        $this->actingAs($this->staf, 'web')
            ->deleteJson("/api/integration-clients/{$this->client->id}/tokens/{$tokenId}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->actingAs($this->staf, 'web')
            ->deleteJson("/api/integration-clients/{$this->client->id}/tokens/{$tokenId}", ['password' => 'Password123'])
            ->assertOk()
            ->assertJsonCount(0, 'data.tokens');

        Auth::forgetGuards();
        $this->withToken($this->token)->getJson('/api/integrations/v1/ping')->assertUnauthorized();

        Auth::forgetGuards();
        $this->actingAs($this->staf, 'web')
            ->deleteJson("/api/integration-clients/{$this->client->id}/tokens/{$tokenId}", ['password' => 'Password123'])
            ->assertNotFound();
    }

    public function test_audit_log_records_the_staff_without_token_values(): void
    {
        $token = $this->actingAs($this->staf, 'web')
            ->postJson("/api/integration-clients/{$this->client->id}/tokens", ['password' => 'Password123'])
            ->json('token');

        $activity = Activity::query()->where('log_name', 'integration')->where('event', 'token_issued')->latest('id')->firstOrFail();
        $this->assertSame($this->staf->id, $activity->causer_id);
        $this->assertSame($this->village->id, $activity->properties['village_id']);

        $logged = Activity::query()->where('log_name', 'integration')->get()->toJson();
        $this->assertStringNotContainsString(explode('|', $token, 2)[1], $logged);
        $this->assertStringNotContainsString('Password123', $logged);
    }

    /**
     * @param  list<string>  $events
     * @return list<string>
     */
    private function staffEvents(array $events): array
    {
        return Activity::query()
            ->where('log_name', 'integration')
            ->where('causer_id', $this->staf->id)
            ->whereIn('event', $events)
            ->orderBy('id')
            ->pluck('event')
            ->all();
    }
}
