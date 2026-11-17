<?php

namespace Tests\Feature\Integration;

use App\Enums\CimartApplicationStatus;
use App\Enums\IntegrationAbility;
use App\Models\Citizen;
use App\Models\CitizenBusiness;
use App\Models\IntegrationClient;
use App\Models\Letter;
use App\Models\User;
use App\Models\Village;
use App\Notifications\CimartApplicationNotification;
use App\Providers\AppServiceProvider;
use App\Services\CitizenBusinessService;
use App\Services\IntegrationClientService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

/**
 * API permohonan pedagang untuk Cimart (langkah 5), sesuai kontrak
 * docs/thirdparty/cimart/api-spec/openapi.yaml.
 */
class SellerApplicationApiTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = '/api/integrations/v1/seller-applications';

    private Village $village;

    private IntegrationClient $client;

    private string $token;

    private Citizen $citizen;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        ['client' => $this->client, 'token' => $this->token] = app(IntegrationClientService::class)->create(
            'cimart',
            'Cimart',
            [IntegrationAbility::SellerApplicationsRead->value, IntegrationAbility::SellerApplicationsUpdate->value],
            $this->village->id,
        );

        $this->citizen = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'name' => 'Joni Saputra',
            'nik' => '3201010101900001',
        ]);
        $this->owner = User::factory()->create(['village_id' => $this->village->id, 'citizen_id' => $this->citizen->id]);
    }

    public function test_businesses_not_registered_to_cimart_never_leave_the_api(): void
    {
        $notRegistered = $this->business(null);
        $pending = $this->business(CimartApplicationStatus::Pending);

        foreach (['pending', 'accepted', 'rejected'] as $status) {
            $ids = collect($this->api()->getJson(self::BASE.'?status='.$status)->assertOk()->json('data'))->pluck('business_ref');
            $this->assertNotContains($notRegistered->id, $ids);
        }

        $this->api()->getJson(self::BASE.'/'.$notRegistered->id)->assertNotFound();
        $this->api()->patchJson(self::BASE.'/'.$notRegistered->id, ['status' => 'accepted'])->assertNotFound();
        $this->api()->getJson(self::BASE)->assertJsonPath('data.0.business_ref', $pending->id);
        $this->assertNull($notRegistered->fresh()->cimart_status);
    }

    public function test_list_returns_the_contract_fields_with_iso_dates(): void
    {
        $business = $this->business(CimartApplicationStatus::Pending, [
            'business_name' => 'Warung Kopi Joni',
            'business_activity' => 'Warung kopi',
            'email' => 'warkopjoni@example.com',
            'phone' => '081234567890',
            'address' => 'Jl. Raya Cibenda No. 12',
        ]);

        $this->api()->getJson(self::BASE)
            ->assertOk()
            ->assertExactJson([
                'data' => [[
                    'business_ref' => $business->id,
                    'status' => 'pending',
                    'requested_at' => $business->cimart_requested_at->toIso8601String(),
                    'decided_at' => null,
                    'note' => null,
                    'nik' => '3201010101900001',
                    'name' => 'Joni Saputra',
                    'business_name' => 'Warung Kopi Joni',
                    'business_activity' => 'Warung kopi',
                    'category' => 'kuliner',
                    'category_label' => 'Toko Kuliner',
                    'email' => 'warkopjoni@example.com',
                    'phone' => '081234567890',
                    'address' => 'Jl. Raya Cibenda No. 12',
                    'letter_number' => $business->letter->letter_number,
                    'issued_at' => $business->letter->processed_at->toIso8601String(),
                    'expires_at' => $business->letter->expires_at->toIso8601String(),
                ]],
                'meta' => ['current_page' => 1, 'per_page' => 50, 'total' => 1, 'last_page' => 1],
            ]);

        $this->assertMatchesRegularExpression('/\+07:00$/', $business->letter->processed_at->toIso8601String());
    }

    public function test_list_filters_by_status_and_since_and_orders_as_a_queue(): void
    {
        $newest = $this->business(CimartApplicationStatus::Pending, ['cimart_requested_at' => now()->subHour()]);
        $oldest = $this->business(CimartApplicationStatus::Pending, ['cimart_requested_at' => now()->subDays(3)]);
        $middle = $this->business(CimartApplicationStatus::Pending, ['cimart_requested_at' => now()->subDay()]);
        $accepted = $this->business(CimartApplicationStatus::Accepted);
        $rejected = $this->business(CimartApplicationStatus::Rejected);

        $this->assertSame(
            [$oldest->id, $middle->id, $newest->id],
            $this->api()->getJson(self::BASE)->json('data.*.business_ref'),
        );
        $this->assertSame([$accepted->id], $this->api()->getJson(self::BASE.'?status=accepted')->json('data.*.business_ref'));
        $this->assertSame([$rejected->id], $this->api()->getJson(self::BASE.'?status=rejected')->json('data.*.business_ref'));

        $since = urlencode(now()->subDays(2)->toIso8601String());
        $this->assertSame([$middle->id, $newest->id], $this->api()->getJson(self::BASE.'?since='.$since)->json('data.*.business_ref'));

        $this->api()->getJson(self::BASE.'?status=cancelled')->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->api()->getJson(self::BASE.'?per_page=101')->assertUnprocessable()->assertJsonValidationErrors('per_page');
    }

    public function test_list_paginates_with_meta(): void
    {
        foreach (range(1, 3) as $day) {
            $this->business(CimartApplicationStatus::Pending, ['cimart_requested_at' => now()->subDays($day)]);
        }

        $this->api()->getJson(self::BASE.'?per_page=2&page=2')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta', ['current_page' => 2, 'per_page' => 2, 'total' => 3, 'last_page' => 2]);
    }

    public function test_pending_application_with_an_expired_sku_is_still_listed(): void
    {
        $business = $this->business(CimartApplicationStatus::Pending, letterExpiresAt: now()->subDay());

        $this->api()->getJson(self::BASE)->assertJsonPath('data.0.business_ref', $business->id);
        $this->api()->getJson(self::BASE.'/'.$business->id)->assertOk();
    }

    public function test_business_without_a_registered_citizen_or_from_another_village_is_hidden(): void
    {
        $orphan = $this->business(CimartApplicationStatus::Pending, ['citizen_id' => null]);

        $otherVillage = Village::factory()->create();
        $otherCitizen = Citizen::factory()->create(['village_id' => $otherVillage->id]);
        $otherLetter = $this->letter($otherVillage, $otherCitizen);
        $foreign = CitizenBusiness::factory()->cimart(CimartApplicationStatus::Pending)->create([
            'letter_id' => $otherLetter->id,
            'village_id' => $otherVillage->id,
            'citizen_id' => $otherCitizen->id,
        ]);

        $this->api()->getJson(self::BASE)->assertJsonCount(0, 'data');
        $this->api()->getJson(self::BASE.'/'.$orphan->id)->assertNotFound();
        $this->api()->getJson(self::BASE.'/'.$foreign->id)->assertNotFound();
        $this->api()->getJson(self::BASE.'/bukan-uuid')->assertNotFound();
    }

    public function test_cancelled_application_is_never_listed_and_detail_returns_410_without_personal_data(): void
    {
        $cancelled = $this->business(CimartApplicationStatus::Cancelled);

        foreach (['pending', 'accepted', 'rejected'] as $status) {
            $this->api()->getJson(self::BASE.'?status='.$status)->assertJsonCount(0, 'data');
        }

        $response = $this->api()->getJson(self::BASE.'/'.$cancelled->id)
            ->assertStatus(410)
            ->assertExactJson([
                'message' => 'Permohonan dibatalkan oleh pemohon.',
                'code' => 'application_cancelled',
            ]);

        $this->assertStringNotContainsString('3201010101900001', $response->getContent());
        $this->assertDatabaseHas('activity_log', ['log_name' => 'integration', 'event' => 'application_cancelled_seen']);
    }

    public function test_reregistered_application_returns_as_pending_with_the_same_ref(): void
    {
        $business = $this->business(CimartApplicationStatus::Rejected, ['cimart_requested_at' => now()->subWeek()]);

        Carbon::setTestNow(now()->addMinute());
        app(CitizenBusinessService::class)->requestCimart($business);

        $this->api()->getJson(self::BASE)
            ->assertJsonPath('data.0.business_ref', $business->id)
            ->assertJsonPath('data.0.status', 'pending')
            ->assertJsonPath('data.0.requested_at', now()->toIso8601String())
            ->assertJsonPath('data.0.note', null);

        Carbon::setTestNow();
    }

    public function test_pending_can_be_accepted_and_notifies_the_owner(): void
    {
        Notification::fake();
        $business = $this->business(CimartApplicationStatus::Pending);

        $this->api()->patchJson(self::BASE.'/'.$business->id, ['status' => 'accepted'])
            ->assertOk()
            ->assertJsonPath('data.business_ref', $business->id)
            ->assertJsonPath('data.status', 'accepted')
            ->assertJsonPath('data.note', null);

        $business->refresh();
        $this->assertSame(CimartApplicationStatus::Accepted, $business->cimart_status);
        $this->assertNotNull($business->cimart_decided_at);

        Notification::assertSentTo($this->owner, CimartApplicationNotification::class, function (CimartApplicationNotification $notification) {
            $data = $notification->toArray($this->owner);

            return $data['context']['status'] === 'cimart_accepted' && $data['color'] === 'green';
        });
        $this->assertDatabaseHas('activity_log', ['log_name' => 'integration', 'event' => 'application_accepted']);
    }

    public function test_pending_can_be_rejected_with_a_note_shown_to_the_owner(): void
    {
        Notification::fake();
        $business = $this->business(CimartApplicationStatus::Pending);

        $this->api()->patchJson(self::BASE.'/'.$business->id, ['status' => 'rejected'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.note.0', 'Alasan penolakan wajib diisi.');

        $this->api()->patchJson(self::BASE.'/'.$business->id, [
            'status' => 'rejected',
            'note' => 'Foto usaha tidak sesuai dengan kategori yang dipilih.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.note', 'Foto usaha tidak sesuai dengan kategori yang dipilih.');

        Notification::assertSentTo($this->owner, CimartApplicationNotification::class, function (CimartApplicationNotification $notification) {
            $data = $notification->toArray($this->owner);

            return $data['context']['status'] === 'cimart_rejected'
                && str_contains($data['message'], 'Foto usaha tidak sesuai dengan kategori yang dipilih.');
        });
    }

    public function test_same_status_is_idempotent_and_a_different_one_conflicts(): void
    {
        Notification::fake();
        $business = $this->business(CimartApplicationStatus::Pending);

        $this->api()->patchJson(self::BASE.'/'.$business->id, ['status' => 'accepted'])->assertOk();
        $decidedAt = $business->fresh()->cimart_decided_at;

        Carbon::setTestNow(now()->addHour());
        $this->api()->patchJson(self::BASE.'/'.$business->id, ['status' => 'accepted'])
            ->assertOk()
            ->assertJsonPath('data.status', 'accepted');
        $this->assertEquals($decidedAt, $business->fresh()->cimart_decided_at);
        Notification::assertSentToTimes($this->owner, CimartApplicationNotification::class, 1);

        $this->api()->patchJson(self::BASE.'/'.$business->id, ['status' => 'rejected', 'note' => 'Salah klik.'])
            ->assertStatus(409)
            ->assertExactJson([
                'message' => 'Permohonan sudah diproses sebelumnya.',
                'code' => 'application_already_processed',
            ]);
        $this->assertSame(CimartApplicationStatus::Accepted, $business->fresh()->cimart_status);

        Carbon::setTestNow();
    }

    public function test_cancelled_application_cannot_be_reported(): void
    {
        Notification::fake();
        $business = $this->business(CimartApplicationStatus::Cancelled);

        $this->api()->patchJson(self::BASE.'/'.$business->id, ['status' => 'accepted'])
            ->assertStatus(410)
            ->assertJson(['code' => 'application_cancelled']);

        $this->assertSame(CimartApplicationStatus::Cancelled, $business->fresh()->cimart_status);
        Notification::assertNothingSent();
        $this->assertDatabaseHas('activity_log', ['log_name' => 'integration', 'event' => 'application_cancelled_seen']);
    }

    public function test_citizen_cancel_then_cimart_accept_returns_410(): void
    {
        $business = $this->business(CimartApplicationStatus::Pending);

        app(CitizenBusinessService::class)->cancelCimart($business, $this->owner);

        $this->api()->patchJson(self::BASE.'/'.$business->id, ['status' => 'accepted'])->assertStatus(410);
        $this->assertSame(CimartApplicationStatus::Cancelled, $business->fresh()->cimart_status);
    }

    public function test_cimart_accept_then_citizen_cancel_is_rejected(): void
    {
        $business = $this->business(CimartApplicationStatus::Pending);

        $this->api()->patchJson(self::BASE.'/'.$business->id, ['status' => 'accepted'])->assertOk();

        $this->actingAs($this->owner, 'web')
            ->deleteJson("/api/profile/businesses/{$business->id}/cimart-application")
            ->assertStatus(409);
        $this->assertSame(CimartApplicationStatus::Accepted, $business->fresh()->cimart_status);
    }

    public function test_rate_limit_returns_429_with_retry_after_and_logs_once(): void
    {
        foreach (range(1, AppServiceProvider::INTEGRATION_REQUESTS_PER_MINUTE) as $attempt) {
            $this->api()->getJson('/api/integrations/v1/ping')->assertOk();
        }

        $this->api()->getJson('/api/integrations/v1/ping')
            ->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJson(['code' => 'too_many_attempts']);
        $this->api()->getJson('/api/integrations/v1/ping')->assertStatus(429);

        $this->assertSame(1, Activity::query()->where('log_name', 'integration')->where('event', 'rate_limited')->count());
    }

    public function test_audit_log_never_contains_nik_or_token(): void
    {
        $business = $this->business(CimartApplicationStatus::Pending);

        $this->api()->getJson(self::BASE)->assertOk();
        $this->api()->getJson(self::BASE.'/'.$business->id)->assertOk();
        $this->api()->patchJson(self::BASE.'/'.$business->id, ['status' => 'accepted'])->assertOk();

        $events = Activity::query()->where('log_name', 'integration')->pluck('event')->all();
        foreach (['applications_listed', 'application_read', 'application_accepted'] as $event) {
            $this->assertContains($event, $events);
        }

        $read = Activity::query()->where('event', 'application_read')->firstOrFail();
        $this->assertSame($business->id, $read->properties['business_ref']);
        $this->assertSame(IntegrationClient::class, $read->causer_type);
        $this->assertSame($this->client->id, $read->causer_id);

        $logged = Activity::query()->where('log_name', 'integration')->get()->toJson();
        $this->assertStringNotContainsString('3201010101900001', $logged);
        $this->assertStringNotContainsString(explode('|', $this->token, 2)[1], $logged);
    }

    /** Request dengan token Cimart; guard di-reset agar tiap request dinilai ulang. */
    private function api(): static
    {
        Auth::forgetGuards();

        return $this->withToken($this->token);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function business(?CimartApplicationStatus $status, array $attributes = [], mixed $letterExpiresAt = null): CitizenBusiness
    {
        $letter = $this->letter($this->village, $this->citizen, $letterExpiresAt);
        $factory = CitizenBusiness::factory()->state([
            'letter_id' => $letter->id,
            'village_id' => $this->village->id,
            'citizen_id' => $this->citizen->id,
        ]);

        return ($status === null ? $factory : $factory->cimart($status))->create($attributes)->load('letter');
    }

    private function letter(Village $village, Citizen $citizen, mixed $expiresAt = null): Letter
    {
        return Letter::factory()->create([
            'village_id' => $village->id,
            'citizen_id' => $citizen->id,
            'status' => 'approved',
            'letter_number' => '470/'.fake()->unique()->numerify('###').'/Des/XI/2026',
            'processed_at' => now()->subDay()->startOfSecond(),
            'expires_at' => ($expiresAt ?? now()->addYear())->copy()->startOfSecond(),
        ]);
    }
}
