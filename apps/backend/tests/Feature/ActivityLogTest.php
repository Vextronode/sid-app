<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Letter;
use App\Models\LetterStatusLog;
use App\Models\Rt;
use App\Models\User;
use App\Models\Village;
use App\Services\PopulationAuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

/**
 * S-05. Jejak audit CRUD warga & KK oleh Staf SIDUTama dan halaman Log
 * Aktivitas (riwayat penduduk + riwayat status surat).
 */
class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    private Village $village;

    private User $staf;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        $this->staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);
    }

    private function citizenPayload(array $overrides = []): array
    {
        return [
            'nik' => '3201012345670001',
            'name' => 'Siti Aminah',
            'date_of_birth' => '1990-05-12',
            'gender' => 'P',
            'address' => 'Jl. Merdeka No. 10',
            'rt_id' => Rt::factory()->create(['village_id' => $this->village->id])->id,
            ...$overrides,
        ];
    }

    public function test_citizen_create_update_delete_are_logged_without_plain_nik(): void
    {
        $id = $this->actingAs($this->staf)
            ->postJson('/api/citizens', $this->citizenPayload())
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($this->staf)
            ->patchJson("/api/citizens/{$id}", ['name' => 'Siti Aminah Putri', 'address' => 'Jl. Baru 1'])
            ->assertOk();

        $this->actingAs($this->staf)->deleteJson("/api/citizens/{$id}")->assertSuccessful();

        $logs = Activity::query()->where('log_name', 'citizen')->orderBy('id')->get();
        $this->assertSame(['created', 'updated', 'deleted'], $logs->pluck('event')->all());
        $this->assertTrue($logs->every(fn (Activity $log) => $log->causer_id === $this->staf->id && $log->subject_id === $id));

        $created = $logs[0]->properties;
        $this->assertSame($this->village->id, $created['village_id']);
        $this->assertSame('manual', $created['source']);
        $this->assertSame(PopulationAuditService::REDACTED, $created['changes']['nik']['new']);
        $this->assertArrayNotHasKey('nik_hash', $created['changes']);

        $this->assertSame(
            ['old' => 'Siti Aminah', 'new' => 'Siti Aminah Putri'],
            $logs[1]->properties['changes']['name'],
        );
        $this->assertSame('Jl. Baru 1', $logs[1]->properties['changes']['address']['new']);
        $this->assertSame('Siti Aminah Putri', $logs[2]->properties['changes']['name']['old']);

        $this->assertStringNotContainsString('3201012345670001', Activity::query()->pluck('properties')->toJson());
    }

    public function test_update_without_real_changes_is_not_logged(): void
    {
        $citizen = Citizen::factory()->create(['village_id' => $this->village->id, 'name' => 'Budi']);

        $this->actingAs($this->staf)->patchJson("/api/citizens/{$citizen->id}", ['name' => 'Budi'])->assertOk();

        $this->assertSame(0, Activity::query()->where('log_name', 'citizen')->count());
    }

    public function test_family_and_socioeconomic_changes_are_logged_with_masked_no_kk(): void
    {
        $familyId = $this->actingAs($this->staf)
            ->postJson('/api/families', ['no_kk' => '3201011234560001', 'family_address' => 'Jl. Merdeka No. 10'])
            ->assertCreated()
            ->json('data.id');

        $this->actingAs($this->staf)
            ->patchJson("/api/families/{$familyId}", ['family_status' => 'pindah', 'family_address' => 'Jl. Lain'])
            ->assertOk();

        $this->actingAs($this->staf)
            ->putJson("/api/families/{$familyId}/socioeconomic", ['household_income_range' => '3-5jt', 'dependents_count' => 2])
            ->assertOk();
        $this->actingAs($this->staf)
            ->putJson("/api/families/{$familyId}/socioeconomic", ['household_income_range' => '3-5jt', 'dependents_count' => 4])
            ->assertOk();

        $logs = Activity::query()->where('log_name', 'family')->orderBy('id')->get();
        $this->assertSame(['created', 'updated', 'socioeconomic_updated', 'socioeconomic_updated'], $logs->pluck('event')->all());
        $this->assertTrue($logs->every(fn (Activity $log) => $log->subject_id === $familyId));
        $this->assertSame('KK •••• 0001', $logs[0]->properties['subject_label']);
        $this->assertSame(['old' => 'aktif', 'new' => 'pindah'], $logs[1]->properties['changes']['family_status']);
        $this->assertSame(PopulationAuditService::REDACTED, $logs[1]->properties['changes']['family_address']['new']);
        $this->assertSame(['old' => 2, 'new' => 4], $logs[3]->properties['changes']['dependents_count']);
        $this->assertArrayNotHasKey('household_income_range', $logs[3]->properties['changes']);
        $this->assertArrayNotHasKey('surveyed_at', $logs[3]->properties['changes']);

        $this->assertStringNotContainsString('3201011234560001', Activity::query()->pluck('properties')->toJson());
    }

    public function test_population_endpoint_is_scoped_filterable_and_includes_deleted_subjects(): void
    {
        $citizen = Citizen::factory()->create(['village_id' => $this->village->id, 'name' => 'Ani']);
        $this->actingAs($this->staf)->patchJson("/api/citizens/{$citizen->id}", ['name' => 'Ani Lestari'])->assertOk();
        $this->actingAs($this->staf)->deleteJson("/api/citizens/{$citizen->id}")->assertSuccessful();

        $otherVillage = Village::factory()->create();
        $otherStaf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $otherVillage->id]);
        $other = Citizen::factory()->create([
            'village_id' => $otherVillage->id,
            'rt_id' => Rt::factory()->create(['village_id' => $otherVillage->id])->id,
            'hamlet_id' => null,
            'family_id' => null,
        ]);
        $this->actingAs($otherStaf)->patchJson("/api/citizens/{$other->id}", ['name' => 'Desa Lain'])->assertOk();

        $this->actingAs($this->staf)
            ->getJson('/api/activity-logs/population')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.event', 'deleted')
            ->assertJsonPath('data.0.subject_label', 'Ani Lestari')
            ->assertJsonPath('data.0.actor.name', $this->staf->name)
            ->assertJsonPath('data.1.changes.name.new', 'Ani Lestari');

        $this->actingAs($this->staf)
            ->getJson("/api/activity-logs/population?type=citizen&event=updated&subject_id={$citizen->id}")
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->actingAs($this->staf)
            ->getJson('/api/activity-logs/population?type=family')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }

    public function test_letters_endpoint_lists_village_status_changes_with_filters(): void
    {
        $letter = Letter::factory()->create(['village_id' => $this->village->id, 'letter_number' => '470/001']);
        LetterStatusLog::query()->create([
            'letter_id' => $letter->id, 'actor_id' => $this->staf->id,
            'old_status' => 'pending', 'new_status' => 'pending', 'reason' => 'Permohonan surat dibuat',
        ]);
        LetterStatusLog::query()->create([
            'letter_id' => $letter->id, 'actor_id' => $this->staf->id,
            'old_status' => 'pending', 'new_status' => 'rejected', 'reason' => 'Data kurang',
        ]);
        $otherLetter = Letter::factory()->create(['village_id' => Village::factory()->create()->id]);
        LetterStatusLog::query()->create([
            'letter_id' => $otherLetter->id, 'actor_id' => $this->staf->id,
            'old_status' => 'pending', 'new_status' => 'approved',
        ]);

        $this->actingAs($this->staf)
            ->getJson('/api/activity-logs/letters')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.letter.letter_number', '470/001')
            ->assertJsonPath('data.0.actor.id', $this->staf->id);

        $this->actingAs($this->staf)
            ->getJson('/api/activity-logs/letters?new_status=rejected')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.reason', 'Data kurang');
    }

    public function test_activity_log_endpoints_are_restricted_to_staf_sid_and_validate_filters(): void
    {
        foreach (['kepala_desa', 'kasi_pemerintahan', 'warga'] as $role) {
            $user = User::factory()->create(['role' => $role, 'village_id' => $this->village->id]);
            $this->actingAs($user)->getJson('/api/activity-logs/population')->assertForbidden();
            $this->actingAs($user)->getJson('/api/activity-logs/letters')->assertForbidden();
        }

        $this->actingAs($this->staf)
            ->getJson('/api/activity-logs/population?type=lainnya&from=2026-10-10&to=2026-10-01')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['type', 'to']);
    }

    public function test_activity_log_endpoints_accept_a_page_size(): void
    {
        foreach (['population', 'letters'] as $endpoint) {
            $this->actingAs($this->staf)
                ->getJson("/api/activity-logs/{$endpoint}")
                ->assertOk()
                ->assertJsonPath('meta.per_page', 20);

            $this->actingAs($this->staf)
                ->getJson("/api/activity-logs/{$endpoint}?per_page=10")
                ->assertOk()
                ->assertJsonPath('meta.per_page', 10);

            $this->actingAs($this->staf)
                ->getJson("/api/activity-logs/{$endpoint}?per_page=500")
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['per_page']);
        }
    }

    public function test_letter_fulfillment_log_is_visible_and_not_duplicated(): void
    {
        activity('citizen')
            ->event('letter_fulfilled')
            ->withProperties(['village_id' => $this->village->id, 'subject_label' => 'Ani', 'changes' => []])
            ->log('Data kependudukan diubah berdasarkan surat');

        $this->actingAs($this->staf)
            ->getJson('/api/activity-logs/population?event=letter_fulfilled')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
    }

    public function test_family_and_socioeconomic_logs_ignore_family_owned_by_another_village(): void
    {
        $family = Family::factory()->create(['village_id' => Village::factory()->create()->id]);

        $this->actingAs($this->staf)
            ->patchJson("/api/families/{$family->id}", ['family_status' => 'pindah'])
            ->assertNotFound();

        $this->assertSame(0, Activity::query()->count());
    }
}
