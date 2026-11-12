<?php

namespace Tests\Feature;

use App\Enums\BusinessCategory;
use App\Enums\CimartApplicationStatus;
use App\Models\Citizen;
use App\Models\CitizenBusiness;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\User;
use App\Models\Village;
use Database\Seeders\ApprovalFlowSeeder;
use Database\Seeders\LetterTypeSeeder;
use DateTimeInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Activitylog\Models\Activity;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Data Usaha Warga (Staf SIDUTama dan petugas SKU) dan Usaha Saya (warga),
 * termasuk tombol daftar dan batal pendaftaran Cimart.
 */
class CitizenBusinessEndpointTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    /** @var array{user: User, citizen: Citizen} */
    private array $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        $this->seed([ApprovalFlowSeeder::class, LetterTypeSeeder::class]);

        ['rt' => $rt] = $this->makeArea($this->village);
        $this->owner = $this->makeCitizenAccount($this->village, $rt);
    }

    /**
     * SKU saat ini ditangani Kaur TU & Umum (kategori Persuratan).
     *
     * @return array<string, array{string, bool}>
     */
    public static function roleAccess(): array
    {
        return [
            'staf_sid' => ['staf_sid', true],
            'kaur_tu_umum' => ['kaur_tu_umum', true],
            'kasi_pemerintahan' => ['kasi_pemerintahan', false],
            'kepala_desa' => ['kepala_desa', false],
            'sekretaris_desa' => ['sekretaris_desa', false],
            'kadus' => ['kadus', false],
            'rw' => ['rw', false],
            'rt' => ['rt', false],
        ];
    }

    #[DataProvider('roleAccess')]
    public function test_data_usaha_warga_is_limited_to_staff_and_the_sku_handler(string $role, bool $allowed): void
    {
        $business = $this->business(null);
        $user = $this->makeOfficialUser($role, $this->village)['user'];

        $this->actingAs($user)->getJson('/api/citizen-businesses')->assertStatus($allowed ? 200 : 403);
        $this->actingAs($user)->getJson("/api/citizen-businesses/{$business->id}")->assertStatus($allowed ? 200 : 403);
        $this->actingAs($user)->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.can_view_citizen_businesses', $allowed);
    }

    public function test_citizens_cannot_open_data_usaha_warga(): void
    {
        $business = $this->business(null);

        $this->actingAs($this->owner['user'])->getJson('/api/citizen-businesses')->assertForbidden();
        $this->actingAs($this->owner['user'])->getJson("/api/citizen-businesses/{$business->id}")->assertForbidden();
        $this->actingAs($this->owner['user'])->getJson('/api/user')
            ->assertJsonPath('data.can_view_citizen_businesses', false);
    }

    public function test_access_follows_the_sku_handler_when_its_category_moves(): void
    {
        $kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village)['user'];
        $kaur = $this->makeOfficialUser('kaur_tu_umum', $this->village)['user'];

        $this->letterType()->update(['assigned_role' => 'kasi_pemerintahan']);

        $this->actingAs($kasi)->getJson('/api/citizen-businesses')->assertOk();
        $this->actingAs($kaur)->getJson('/api/citizen-businesses')->assertForbidden();

        // Tanpa petugas khusus: Kasi Pemerintahan dan Kaur TU & Umum.
        $this->letterType()->update(['assigned_role' => null]);

        $this->actingAs($kasi)->getJson('/api/citizen-businesses')->assertOk();
        $this->actingAs($kaur)->getJson('/api/citizen-businesses')->assertOk();
    }

    public function test_staff_only_see_businesses_of_their_own_village(): void
    {
        $staff = $this->makeOfficialUser('staf_sid', $this->village)['user'];
        $own = $this->business(null);

        $otherVillage = Village::factory()->create();
        $foreignLetter = Letter::factory()->create(['village_id' => $otherVillage->id, 'status' => 'approved']);
        $foreign = CitizenBusiness::factory()->create(['letter_id' => $foreignLetter->id]);

        $this->actingAs($staff)->getJson('/api/citizen-businesses')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $own->id);
        $this->actingAs($staff)->getJson("/api/citizen-businesses/{$foreign->id}")->assertForbidden();
    }

    public function test_detail_shows_the_business_its_owner_and_its_letter(): void
    {
        $staff = $this->makeOfficialUser('staf_sid', $this->village)['user'];
        $business = $this->business(CimartApplicationStatus::Rejected);

        $this->actingAs($staff)->getJson("/api/citizen-businesses/{$business->id}")
            ->assertOk()
            ->assertJsonPath('data.business_name', $business->business_name)
            ->assertJsonPath('data.category', 'kuliner')
            ->assertJsonPath('data.category_label', 'Toko Kuliner')
            ->assertJsonPath('data.email', $business->email)
            ->assertJsonPath('data.phone', $business->phone)
            ->assertJsonPath('data.citizen.id', $this->owner['citizen']->id)
            ->assertJsonPath('data.citizen.name', $this->owner['citizen']->name)
            ->assertJsonPath('data.letter.id', $business->letter_id)
            ->assertJsonPath('data.letter_status', 'berlaku')
            ->assertJsonPath('data.cimart_status', 'rejected')
            ->assertJsonPath('data.cimart_status_label', 'Ditolak')
            ->assertJsonPath('data.cimart_note', 'Foto usaha tidak sesuai.')
            // Tombol hanya untuk pemilik.
            ->assertJsonMissingPath('data.can_request_cimart');
    }

    public function test_list_searches_and_filters(): void
    {
        $staff = $this->makeOfficialUser('staf_sid', $this->village)['user'];
        $kopi = $this->business(null, attributes: ['business_name' => 'Warung Kopi Joni']);
        $toko = $this->business(CimartApplicationStatus::Pending, attributes: [
            'business_name' => 'Toko Berkah',
            'category' => BusinessCategory::Kelontong,
        ]);
        $other = $this->makeCitizenAccount($this->village, null, citizenAttributes: ['name' => 'Siti Aminah']);
        $siti = $this->business(CimartApplicationStatus::Accepted, citizen: $other['citizen'], attributes: [
            'business_name' => 'Jahit Rapi',
            'category' => BusinessCategory::NonKuliner,
        ]);

        $ids = fn (string $query) => collect($this->actingAs($staff)->getJson("/api/citizen-businesses?{$query}")->assertOk()->json('data'))
            ->pluck('id')->sort()->values()->all();

        $this->assertSame([$kopi->id], $ids('search=kopi'));
        $this->assertSame([$siti->id], $ids('search=AMINAH'));
        $this->assertSame([$toko->id], $ids('category=kelontong'));
        $this->assertSame([$kopi->id], $ids('cimart_status=none'));
        $this->assertSame([$siti->id], $ids('cimart_status=accepted'));
        $this->assertSame(collect([$kopi->id, $toko->id, $siti->id])->sort()->values()->all(), $ids(''));

        $this->actingAs($staff)->getJson('/api/citizen-businesses?cimart_status=unknown')->assertUnprocessable();
        $this->actingAs($staff)->getJson('/api/citizen-businesses?letter_status=aktif')->assertUnprocessable();
    }

    public function test_letter_status_filter_follows_the_expiry_moment(): void
    {
        $this->freezeTime();
        $staff = $this->makeOfficialUser('staf_sid', $this->village)['user'];
        $endsNow = $this->business(null, now());
        $ended = $this->business(null, now()->subSecond());
        $noExpiry = $this->business(null, attributes: [], withoutExpiry: true);

        $ids = fn (string $status) => collect($this->actingAs($staff)->getJson("/api/citizen-businesses?letter_status={$status}")->assertOk()->json('data'))
            ->pluck('id')->sort()->values()->all();

        $this->assertSame(collect([$endsNow->id, $noExpiry->id])->sort()->values()->all(), $ids('berlaku'));
        $this->assertSame([$ended->id], $ids('kedaluwarsa'));

        $this->actingAs($staff)->getJson("/api/citizen-businesses/{$ended->id}")
            ->assertJsonPath('data.letter_status', 'kedaluwarsa');
    }

    public function test_citizens_see_only_their_own_businesses_with_button_flags(): void
    {
        $mine = $this->business(CimartApplicationStatus::Pending);
        $stranger = $this->makeCitizenAccount($this->village, null);
        $this->business(null, citizen: $stranger['citizen']);

        $this->actingAs($this->owner['user'])->getJson('/api/profile/businesses')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id)
            ->assertJsonPath('data.0.cimart_status_label', 'Menunggu diproses Cimart')
            ->assertJsonPath('data.0.letter.id', $mine->letter_id)
            ->assertJsonPath('data.0.can_request_cimart', false)
            ->assertJsonPath('data.0.can_cancel_cimart', true);

        $official = $this->makeOfficialUser('staf_sid', $this->village)['user'];
        $this->actingAs($official)->getJson('/api/profile/businesses')->assertOk()->assertJsonCount(0, 'data');
    }

    /**
     * @return array<string, array{?CimartApplicationStatus}>
     */
    public static function registrableStatuses(): array
    {
        return [
            'belum mendaftar' => [null],
            'ditolak' => [CimartApplicationStatus::Rejected],
            'dibatalkan' => [CimartApplicationStatus::Cancelled],
        ];
    }

    #[DataProvider('registrableStatuses')]
    public function test_owner_registers_or_re_registers_to_cimart(?CimartApplicationStatus $status): void
    {
        $business = $this->business($status);

        $this->actingAs($this->owner['user'])
            ->postJson("/api/profile/businesses/{$business->id}/cimart-application")
            ->assertOk()
            ->assertJsonPath('data.cimart_status', 'pending')
            ->assertJsonPath('data.cimart_note', null)
            ->assertJsonPath('data.can_cancel_cimart', true)
            ->assertJsonStructure(['message']);

        $this->assertSame(CimartApplicationStatus::Pending, $business->fresh()->cimart_status);
    }

    public function test_registering_is_refused_while_pending_after_acceptance_or_with_an_expired_letter(): void
    {
        foreach ([CimartApplicationStatus::Pending, CimartApplicationStatus::Accepted] as $status) {
            $business = $this->business($status);

            $this->actingAs($this->owner['user'])
                ->postJson("/api/profile/businesses/{$business->id}/cimart-application")
                ->assertStatus(409);
            $this->assertSame($status, $business->fresh()->cimart_status);
        }

        $expired = $this->business(null, now()->subDay());

        $this->actingAs($this->owner['user'])
            ->postJson("/api/profile/businesses/{$expired->id}/cimart-application")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Surat Keterangan Usaha ini sudah tidak berlaku. Ajukan SKU baru untuk mendaftar ke Cimart.');
        $this->assertNull($expired->fresh()->cimart_status);
    }

    public function test_owner_cancels_only_a_pending_registration(): void
    {
        $pending = $this->business(CimartApplicationStatus::Pending);

        $this->actingAs($this->owner['user'])
            ->deleteJson("/api/profile/businesses/{$pending->id}/cimart-application")
            ->assertOk()
            ->assertJsonPath('data.cimart_status', 'cancelled')
            ->assertJsonPath('data.can_request_cimart', true);
        $this->assertSame(1, Activity::query()->where('event', 'cimart_cancelled')->count());

        $accepted = $this->business(CimartApplicationStatus::Accepted);
        $this->actingAs($this->owner['user'])
            ->deleteJson("/api/profile/businesses/{$accepted->id}/cimart-application")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Akun pedagang sudah dibuat Cimart. Hubungi Cimart untuk menghapus akun.');

        foreach ([null, CimartApplicationStatus::Rejected, CimartApplicationStatus::Cancelled] as $status) {
            $business = $this->business($status);

            $this->actingAs($this->owner['user'])
                ->deleteJson("/api/profile/businesses/{$business->id}/cimart-application")
                ->assertStatus(409);
            $this->assertSame($status, $business->fresh()->cimart_status);
        }
    }

    public function test_other_accounts_cannot_register_or_cancel_a_business_they_do_not_own(): void
    {
        $pending = $this->business(CimartApplicationStatus::Pending);
        $fresh = $this->business(null);
        $stranger = $this->makeCitizenAccount($this->village, null)['user'];
        $staff = $this->makeOfficialUser('staf_sid', $this->village)['user'];

        foreach ([$stranger, $staff] as $user) {
            $this->actingAs($user)->postJson("/api/profile/businesses/{$fresh->id}/cimart-application")->assertForbidden();
            $this->actingAs($user)->deleteJson("/api/profile/businesses/{$pending->id}/cimart-application")->assertForbidden();
        }

        $this->assertNull($fresh->fresh()->cimart_status);
        $this->assertSame(CimartApplicationStatus::Pending, $pending->fresh()->cimart_status);
    }

    private function letterType(): LetterType
    {
        return LetterType::query()
            ->where('village_id', $this->village->id)
            ->where('code', CitizenBusiness::SOURCE_LETTER_TYPE_CODE)
            ->firstOrFail();
    }

    private function business(
        ?CimartApplicationStatus $status,
        ?DateTimeInterface $expiresAt = null,
        ?Citizen $citizen = null,
        array $attributes = [],
        bool $withoutExpiry = false,
    ): CitizenBusiness {
        $citizen ??= $this->owner['citizen'];
        $letter = Letter::factory()->create([
            'village_id' => $this->village->id,
            'letter_type_id' => $this->letterType()->id,
            'citizen_id' => $citizen->id,
            'status' => 'approved',
            'expires_at' => $withoutExpiry ? null : ($expiresAt ?? now()->addYear()),
        ]);
        $factory = CitizenBusiness::factory()->state([
            'letter_id' => $letter->id,
            'citizen_id' => $citizen->id,
            ...$attributes,
        ]);

        return ($status === null ? $factory : $factory->cimart($status))->create();
    }
}
