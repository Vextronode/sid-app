<?php

namespace Tests\Feature\Integration;

use App\Enums\IntegrationAbility;
use App\Models\IntegrationClient;
use App\Models\PersonalAccessToken;
use App\Models\User;
use App\Models\Village;
use App\Services\IntegrationClientService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

/**
 * Isolasi dua arah token client integrasi (langkah 4 Cimart): token client
 * hanya berlaku di /api/integrations/v1, dan route itu hanya menerima token
 * client, bukan token atau session User SID.
 */
class IntegrationClientAuthTest extends TestCase
{
    use RefreshDatabase;

    private Village $village;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
    }

    public function test_integration_token_is_rejected_on_internal_routes(): void
    {
        $token = $this->clientToken();

        // IntegrationClient punya is_active, jadi account.active dan
        // password.changed akan meloloskannya bila guard tidak menolak.
        foreach (['/api/user', '/api/notifications', '/api/letters', '/api/citizen-businesses'] as $path) {
            Auth::forgetGuards();

            $this->withToken($token)->getJson($path)->assertUnauthorized();
        }
    }

    public function test_user_token_is_rejected_on_integration_routes(): void
    {
        $user = User::factory()->create(['village_id' => $this->village->id, 'role' => 'staf_sid']);
        $token = $user->createToken('spa')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/integrations/v1/ping')
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Token tidak valid.']);

        // Token user tetap berlaku di route internal.
        Auth::forgetGuards();
        $this->withToken($token)->getJson('/api/user')->assertOk();
    }

    public function test_user_session_is_rejected_on_integration_routes(): void
    {
        $user = User::factory()->create(['village_id' => $this->village->id, 'role' => 'staf_sid']);

        // Session SPA lolos guard Sanctum dengan TransientToken (semua
        // ability); middleware integration.client yang menolaknya.
        $this->actingAs($user, 'web')
            ->getJson('/api/integrations/v1/ping')
            ->assertUnauthorized();

        $this->actingAs($user, 'web')
            ->getJson('/api/integrations/v1/seller-applications')
            ->assertUnauthorized();
    }

    public function test_missing_or_wrong_token_is_rejected(): void
    {
        $this->getJson('/api/integrations/v1/ping')
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Token tidak valid.']);

        $this->withToken('salah|token')->getJson('/api/integrations/v1/ping')->assertUnauthorized();
    }

    /**
     * Bagian sebelum `|` dicari sebagai UUID. Di PostgreSQL (CI dan
     * production), teks yang bukan UUID membuat query error dan respons 500;
     * SQLite di test lokal tidak memeriksa tipe UUID, jadi yang dipastikan
     * di sini adalah token seperti itu ditolak tanpa query sama sekali.
     */
    public function test_malformed_token_id_is_rejected_without_querying_tokens(): void
    {
        $token = $this->clientToken();
        $secret = explode('|', $token, 2)[1];

        foreach (['/api/integrations/v1/ping', '/api/user'] as $path) {
            foreach (['salah|token', "bukan-uuid|{$secret}", "1|{$secret}"] as $malformed) {
                Auth::forgetGuards();
                DB::flushQueryLog();
                DB::enableQueryLog();

                $this->withToken($malformed)->getJson($path)->assertUnauthorized();

                $tokenQueries = array_filter(
                    DB::getQueryLog(),
                    fn (array $query) => str_contains($query['query'], 'personal_access_tokens'),
                );
                $this->assertSame([], $tokenQueries, "{$path} dengan token {$malformed} tidak boleh query ke personal_access_tokens.");
                DB::disableQueryLog();
            }
        }

        // Token utuh tetap berlaku.
        Auth::forgetGuards();
        $this->withToken($token)->getJson('/api/integrations/v1/ping')->assertOk();
        $this->assertNull(PersonalAccessToken::findToken('salah|token'));
        $this->assertNotNull(PersonalAccessToken::findToken($token));
    }

    public function test_ping_returns_client_name_and_token_abilities(): void
    {
        $token = $this->clientToken();

        $this->withToken($token)
            ->getJson('/api/integrations/v1/ping')
            ->assertOk()
            ->assertJsonPath('data.client', 'Cimart')
            ->assertJsonPath('data.abilities', [
                IntegrationAbility::SellerApplicationsRead->value,
                IntegrationAbility::SellerApplicationsUpdate->value,
            ])
            ->assertJsonStructure(['data' => ['client', 'abilities', 'server_time']]);

        $this->assertDatabaseHas('activity_log', ['log_name' => 'integration', 'event' => 'ping']);
    }

    public function test_disabled_client_gets_integration_disabled(): void
    {
        $result = $this->createClient();
        app(IntegrationClientService::class)->setActive($result['client'], false);

        $this->withToken($result['token'])
            ->getJson('/api/integrations/v1/ping')
            ->assertForbidden()
            ->assertJson(['code' => 'integration_disabled']);
    }

    public function test_token_without_the_required_ability_gets_ability_forbidden(): void
    {
        $result = $this->createClient([IntegrationAbility::SellerApplicationsRead->value]);

        $this->withToken($result['token'])
            ->patchJson('/api/integrations/v1/seller-applications/'.fake()->uuid(), ['status' => 'accepted'])
            ->assertForbidden()
            ->assertExactJson([
                'message' => 'Token tidak memiliki akses ke endpoint ini.',
                'code' => 'ability_forbidden',
            ]);
    }

    public function test_rotate_keeps_the_old_token_and_revoke_rejects_it_immediately(): void
    {
        $service = app(IntegrationClientService::class);
        $result = $this->createClient();
        $oldToken = $result['token'];
        $newToken = $service->issueToken($result['client']);

        $this->withToken($oldToken)->getJson('/api/integrations/v1/ping')->assertOk();
        Auth::forgetGuards();
        $this->withToken($newToken)->getJson('/api/integrations/v1/ping')->assertOk();

        $oldTokenId = explode('|', $oldToken, 2)[0];
        $service->revokeToken($result['client'], $oldTokenId);

        Auth::forgetGuards();
        $this->withToken($oldToken)->getJson('/api/integrations/v1/ping')->assertUnauthorized();
        Auth::forgetGuards();
        $this->withToken($newToken)->getJson('/api/integrations/v1/ping')->assertOk();
    }

    public function test_artisan_create_prints_the_token_once_and_stores_only_its_hash(): void
    {
        $this->artisan('integration:create', [
            'slug' => 'cimart',
            '--name' => 'Cimart',
            '--abilities' => 'seller-applications:read,seller-applications:update',
        ])
            ->expectsOutputToContain('Client integrasi Cimart (cimart) berhasil dibuat.')
            ->expectsOutputToContain('hanya ditampilkan sekali')
            ->assertExitCode(0);

        $client = IntegrationClient::query()->where('slug', 'cimart')->firstOrFail();
        $this->assertSame($this->village->id, $client->village_id);
        $this->assertTrue($client->is_active);

        $token = PersonalAccessToken::query()->where('tokenable_id', $client->id)->firstOrFail();
        $this->assertSame(IntegrationClient::class, $token->tokenable_type);
        $this->assertSame(64, strlen($token->token));
        $this->assertSame(['seller-applications:read', 'seller-applications:update'], $token->abilities);

        $this->assertDatabaseHas('activity_log', ['log_name' => 'integration', 'event' => 'client_created']);
        $this->assertDatabaseHas('activity_log', ['log_name' => 'integration', 'event' => 'token_issued']);
        $this->assertTokenNeverLogged($token->token);
    }

    public function test_artisan_create_rejects_unknown_abilities_and_duplicate_slugs(): void
    {
        $this->artisan('integration:create', ['slug' => 'cimart', '--abilities' => 'citizens:delete'])
            ->expectsOutputToContain('Ability tidak dikenal: citizens:delete')
            ->assertExitCode(1);

        $this->createClient();

        $this->artisan('integration:create', ['slug' => 'cimart', '--abilities' => 'seller-applications:read'])
            ->expectsOutputToContain('sudah ada')
            ->assertExitCode(1);
    }

    public function test_artisan_create_requires_a_village_when_there_are_several(): void
    {
        Village::factory()->create();

        $this->artisan('integration:create', ['slug' => 'cimart', '--abilities' => 'seller-applications:read'])
            ->expectsOutputToContain('--village')
            ->assertExitCode(1);

        $this->artisan('integration:create', [
            'slug' => 'cimart',
            '--abilities' => 'seller-applications:read',
            '--village' => 'bukan-uuid',
        ])
            ->expectsOutputToContain('Desa tidak ditemukan')
            ->assertExitCode(1);

        $this->artisan('integration:create', [
            'slug' => 'cimart',
            '--abilities' => 'seller-applications:read',
            '--village' => $this->village->id,
        ])->assertExitCode(0);
    }

    public function test_artisan_enable_disable_rotate_tokens_and_revoke(): void
    {
        $result = $this->createClient();
        $client = $result['client'];

        $this->artisan('integration:disable', ['slug' => 'cimart'])->assertExitCode(0);
        $this->assertFalse($client->fresh()->is_active);

        $this->artisan('integration:enable', ['slug' => 'cimart'])->assertExitCode(0);
        $this->assertTrue($client->fresh()->is_active);

        $this->artisan('integration:rotate', ['slug' => 'cimart'])
            ->expectsOutputToContain('Token lama tetap berlaku')
            ->assertExitCode(0);
        $this->assertSame(2, $client->tokens()->count());

        $tokenId = $client->tokens()->orderBy('created_at')->value('id');
        $this->artisan('integration:tokens', ['slug' => 'cimart'])
            ->expectsOutputToContain($tokenId)
            ->assertExitCode(0);

        $this->artisan('integration:revoke', ['slug' => 'cimart', 'token_id' => $tokenId])->assertExitCode(0);
        $this->assertSame(1, $client->tokens()->count());

        $this->artisan('integration:revoke', ['slug' => 'cimart', 'token_id' => $tokenId])
            ->expectsOutputToContain('Token tidak ditemukan')
            ->assertExitCode(1);

        // ID yang bukan UUID ditolak dengan pesan, bukan error query PostgreSQL.
        $this->artisan('integration:revoke', ['slug' => 'cimart', 'token_id' => 'abc'])
            ->expectsOutputToContain('Token tidak ditemukan')
            ->assertExitCode(1);

        $this->artisan('integration:disable', ['slug' => 'tidak-ada'])
            ->expectsOutputToContain('tidak ditemukan')
            ->assertExitCode(1);
    }

    public function test_artisan_abilities_updates_the_client_and_its_existing_tokens(): void
    {
        $result = $this->createClient();

        $this->artisan('integration:abilities', ['slug' => 'cimart', '--abilities' => 'seller-applications:read'])
            ->assertExitCode(0);

        $this->assertSame(['seller-applications:read'], $result['client']->fresh()->abilities);
        $this->assertSame(['seller-applications:read'], $result['client']->tokens()->first()->abilities);

        $this->withToken($result['token'])
            ->patchJson('/api/integrations/v1/seller-applications/'.fake()->uuid(), ['status' => 'accepted'])
            ->assertForbidden()
            ->assertJson(['code' => 'ability_forbidden']);
    }

    /**
     * @param  list<string>|null  $abilities
     * @return array{client: IntegrationClient, token: string}
     */
    private function createClient(?array $abilities = null): array
    {
        return app(IntegrationClientService::class)->create(
            'cimart',
            'Cimart',
            $abilities ?? [
                IntegrationAbility::SellerApplicationsRead->value,
                IntegrationAbility::SellerApplicationsUpdate->value,
            ],
            $this->village->id,
        );
    }

    private function clientToken(): string
    {
        return $this->createClient()['token'];
    }

    private function assertTokenNeverLogged(string $hash): void
    {
        Activity::query()->where('log_name', 'integration')->get()->each(function (Activity $activity) use ($hash): void {
            $this->assertStringNotContainsString($hash, json_encode($activity->properties));
            $this->assertStringNotContainsString('|', (string) json_encode($activity->properties->except('token_name')));
        });
    }
}
