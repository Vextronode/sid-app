<?php

namespace Tests\Feature\Auth;

use App\Models\Citizen;
use App\Models\PasswordResetRequest;
use App\Models\User;
use App\Models\Village;
use App\Notifications\PasswordResetRequestNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

class PasswordResetRequestTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private const NIK = '3218030000001234';

    private const DOB = '1990-05-17';

    private const NEW_PASSWORD = 'KataSandiBaru123!';

    private Village $village;

    private User $warga;

    private Citizen $citizen;

    private User $staf;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($this->village);
        ['user' => $this->warga, 'citizen' => $this->citizen] = $this->makeCitizenAccount(
            $this->village,
            $rt,
            citizenAttributes: ['nik' => self::NIK, 'date_of_birth' => self::DOB],
        );
        $this->warga->forceFill(['email' => null, 'must_change_password' => true])->save();
        $this->staf = $this->makeOfficialUser('staf_sid', $this->village)['user'];
    }

    // ------------------------------------------------------------------
    // Pengajuan
    // ------------------------------------------------------------------

    public function test_citizen_submits_with_nik_and_date_of_birth_and_staf_is_notified(): void
    {
        $response = $this->postJson('/password-reset-requests', [
            'nik' => self::NIK,
            'date_of_birth' => self::DOB,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.username', $this->warga->username)
            ->assertJsonPath('message', 'Permintaan terkirim. Harap cek kembali halaman ini setelah disetujui staf desa.');

        $token = $response->json('token');
        $this->assertSame(64, strlen($token));

        $resetRequest = PasswordResetRequest::query()->sole();
        $this->assertSame($this->warga->id, $resetRequest->user_id);
        // Token klaim hanya disimpan dalam bentuk hash.
        $this->assertSame(hash('sha256', $token), $resetRequest->claim_token_hash);

        Notification::assertSentTo(
            $this->staf,
            PasswordResetRequestNotification::class,
            fn ($notification) => $notification->toArray($this->staf)['context'] === [
                'status' => 'password_reset_requested',
                'password_reset_request_id' => $resetRequest->id,
            ],
        );
    }

    public function test_identity_mismatches_all_return_the_same_message(): void
    {
        $orphanCitizen = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'nik' => '3218030000009999',
            'date_of_birth' => self::DOB,
        ]);
        $inactive = $this->makeCitizenAccount($this->village, null, citizenAttributes: [
            'nik' => '3218030000008888',
            'date_of_birth' => self::DOB,
        ])['user'];
        $inactive->forceFill(['is_active' => false])->save();

        $cases = [
            'NIK tidak terdaftar' => ['nik' => '3218030000000000', 'date_of_birth' => self::DOB],
            'tanggal lahir salah' => ['nik' => self::NIK, 'date_of_birth' => '1991-01-01'],
            'warga belum punya akun' => ['nik' => $orphanCitizen->nik, 'date_of_birth' => self::DOB],
            'akun nonaktif' => ['nik' => '3218030000008888', 'date_of_birth' => self::DOB],
        ];

        foreach ($cases as $case => $payload) {
            $this->postJson('/password-reset-requests', $payload)
                ->assertUnprocessable()
                ->assertJsonPath(
                    'errors.nik.0',
                    'NIK atau tanggal lahir tidak cocok dengan akun mana pun. Periksa kembali, atau datang ke kantor desa.',
                    $case,
                );
        }

        $this->assertSame(0, PasswordResetRequest::query()->count());
        Notification::assertNothingSent();
    }

    public function test_submission_validates_input(): void
    {
        $this->postJson('/password-reset-requests', ['nik' => '123', 'date_of_birth' => 'bukan-tanggal'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nik', 'date_of_birth']);
    }

    public function test_staf_sid_account_cannot_use_this_flow(): void
    {
        $staf = $this->makeOfficialUser('staf_sid', $this->village);
        $staf['citizen']->update(['nik' => '3218030000007777', 'date_of_birth' => self::DOB]);

        $this->postJson('/password-reset-requests', ['nik' => '3218030000007777', 'date_of_birth' => self::DOB])
            ->assertForbidden();

        $this->assertSame(0, PasswordResetRequest::query()->count());
    }

    public function test_new_submission_cancels_previous_open_request(): void
    {
        $first = $this->submit();
        $this->approveAs($this->staf, PasswordResetRequest::query()->sole());

        $second = $this->submit();

        $this->postJson('/password-reset-requests/status', ['token' => $first])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
        $this->postJson('/password-reset-requests/status', ['token' => $second])
            ->assertOk()
            ->assertJsonPath('data.status', 'pending');

        // Token yang sudah digantikan tidak bisa dipakai lagi meski tadinya disetujui.
        $this->complete($first)->assertStatus(409);
    }

    public function test_logged_in_user_cannot_submit(): void
    {
        $this->actingAs($this->warga)
            ->postJson('/password-reset-requests', ['nik' => self::NIK, 'date_of_birth' => self::DOB])
            ->assertStatus(302);
    }

    // ------------------------------------------------------------------
    // Status & penyelesaian oleh pengaju
    // ------------------------------------------------------------------

    public function test_full_flow_pending_then_approved_then_completed(): void
    {
        $this->warga->createToken('perangkat-lama');
        $token = $this->submit();

        $this->postJson('/password-reset-requests/status', ['token' => $token])
            ->assertOk()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.approved_until', null);

        // Belum disetujui: belum boleh membuat kata sandi.
        $this->complete($token)
            ->assertStatus(409)
            ->assertJsonPath('message', 'Permintaan Anda belum disetujui Staf SIDUTama.');

        $this->approveAs($this->staf, PasswordResetRequest::query()->sole())->assertOk();

        $this->postJson('/password-reset-requests/status', ['token' => $token])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.username', $this->warga->username);

        $this->complete($token)->assertOk();

        $this->warga->refresh();
        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $this->warga->password));
        $this->assertFalse($this->warga->must_change_password);
        $this->assertSame(0, $this->warga->tokens()->count());

        $this->postJson('/password-reset-requests/status', ['token' => $token])
            ->assertJsonPath('data.status', 'completed');

        // Token klaim sekali pakai.
        $this->complete($token, 'KataSandiLain123!')->assertStatus(409);
        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $this->warga->refresh()->password));

        // Kata sandi baru langsung bisa dipakai login.
        $this->postJson('/login', ['username' => $this->warga->username, 'password' => self::NEW_PASSWORD])
            ->assertOk();
    }

    public function test_approval_expires_after_ttl(): void
    {
        $token = $this->submit();
        $this->approveAs($this->staf, PasswordResetRequest::query()->sole());

        $this->travel(PasswordResetRequest::APPROVAL_TTL_HOURS)->hours();
        $this->travel(1)->minutes();

        $this->postJson('/password-reset-requests/status', ['token' => $token])
            ->assertJsonPath('data.status', 'expired');
        $this->complete($token)
            ->assertStatus(409)
            ->assertJsonPath('message', 'Batas waktu membuat kata sandi baru sudah lewat. Ajukan permintaan baru.');
    }

    public function test_rejected_request_shows_notes_and_cannot_be_completed(): void
    {
        $token = $this->submit();

        $this->actingAs($this->staf)
            ->postJson('/api/password-reset-requests/'.PasswordResetRequest::query()->value('id').'/reject', [
                'notes' => 'Silakan datang ke kantor desa membawa KTP.',
            ])
            ->assertOk();
        $this->logoutAll();

        $this->postJson('/password-reset-requests/status', ['token' => $token])
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.response_notes', 'Silakan datang ke kantor desa membawa KTP.');
        $this->complete($token)->assertStatus(409);
    }

    public function test_account_deactivated_after_approval_cannot_complete(): void
    {
        $token = $this->submit();
        $this->approveAs($this->staf, PasswordResetRequest::query()->sole());
        $this->warga->forceFill(['is_active' => false])->save();

        $this->complete($token)->assertForbidden();
        $this->assertFalse(Hash::check(self::NEW_PASSWORD, $this->warga->refresh()->password));
    }

    public function test_unknown_token_is_not_found(): void
    {
        $fake = str_repeat('a', 64);

        $this->postJson('/password-reset-requests/status', ['token' => $fake])->assertNotFound();
        $this->complete($fake)->assertNotFound();
    }

    public function test_complete_validates_password(): void
    {
        $token = $this->submit();

        $this->postJson('/password-reset-requests/complete', [
            'token' => $token,
            'password' => self::NEW_PASSWORD,
            'password_confirmation' => 'beda',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    // ------------------------------------------------------------------
    // Sisi Staf SIDUTama
    // ------------------------------------------------------------------

    public function test_staf_lists_requests_of_own_village_with_identity_hints(): void
    {
        $this->submit();

        $otherVillage = Village::factory()->create();
        $outsider = $this->makeCitizenAccount($otherVillage, null, citizenAttributes: [
            'nik' => '3218030000006666',
            'date_of_birth' => self::DOB,
        ]);
        $this->postJson('/password-reset-requests', ['nik' => '3218030000006666', 'date_of_birth' => self::DOB])
            ->assertCreated();

        $this->actingAs($this->staf)
            ->getJson('/api/password-reset-requests')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'pending')
            ->assertJsonPath('data.0.user.username', $this->warga->username)
            ->assertJsonPath('data.0.user.has_email', false)
            ->assertJsonPath('data.0.user.nik_masked', '************1234')
            ->assertJsonMissingPath('data.0.claim_token_hash');

        $this->assertNotSame($outsider['user']->village_id, $this->staf->village_id);
    }

    public function test_staf_can_filter_by_status(): void
    {
        $this->submit();

        $this->actingAs($this->staf)
            ->getJson('/api/password-reset-requests?status=approved')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->actingAs($this->staf)
            ->getJson('/api/password-reset-requests?status=pending')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_only_staf_sid_of_same_village_can_decide(): void
    {
        $this->submit();
        $resetRequest = PasswordResetRequest::query()->sole();

        $rt = $this->makeOfficialUser('rt', $this->village)['user'];
        $this->actingAs($rt)
            ->getJson('/api/password-reset-requests')
            ->assertForbidden();
        $this->approveAs($rt, $resetRequest)->assertForbidden();

        $otherStaf = $this->makeOfficialUser('staf_sid', Village::factory()->create())['user'];
        $this->approveAs($otherStaf, $resetRequest)->assertForbidden();

        $this->assertSame('pending', $resetRequest->refresh()->status);
    }

    public function test_request_can_only_be_decided_once(): void
    {
        $this->submit();
        $resetRequest = PasswordResetRequest::query()->sole();

        $this->approveAs($this->staf, $resetRequest)->assertOk();
        $this->approveAs($this->staf, $resetRequest)->assertStatus(409);
        $this->actingAs($this->staf)
            ->postJson("/api/password-reset-requests/{$resetRequest->id}/reject")
            ->assertStatus(409);

        $resetRequest->refresh();
        $this->assertSame('approved', $resetRequest->status);
        $this->assertSame($this->staf->id, $resetRequest->handled_by);
        $this->assertTrue($resetRequest->approved_until->isFuture());
    }

    // ------------------------------------------------------------------

    /**
     * Kembali sebagai tamu: actingAs() mengganti guard default ke sanctum,
     * padahal endpoint lupa kata sandi & /login memakai guard web.
     */
    private function logoutAll(): void
    {
        $this->app['auth']->forgetGuards();
        $this->app['auth']->shouldUse('web');
    }

    private function submit(): string
    {
        $this->logoutAll();

        return $this->postJson('/password-reset-requests', [
            'nik' => self::NIK,
            'date_of_birth' => self::DOB,
        ])->assertCreated()->json('token');
    }

    private function approveAs(User $actor, PasswordResetRequest $resetRequest)
    {
        $response = $this->actingAs($actor)
            ->postJson("/api/password-reset-requests/{$resetRequest->id}/approve");
        $this->logoutAll();

        return $response;
    }

    private function complete(string $token, string $password = self::NEW_PASSWORD)
    {
        return $this->postJson('/password-reset-requests/complete', [
            'token' => $token,
            'password' => $password,
            'password_confirmation' => $password,
        ]);
    }
}
