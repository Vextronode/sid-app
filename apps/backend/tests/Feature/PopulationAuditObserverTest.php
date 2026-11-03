<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\FamilySocioeconomic;
use App\Models\User;
use App\Models\Village;
use App\Support\AuditContext;
use Database\Seeders\DemoCitizenSeeder;
use Database\Seeders\DemoVillageSeeder;
use Database\Seeders\OccupationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

/**
 * A1. Jejak audit data kependudukan ditulis observer untuk setiap
 * penyimpanan lewat Eloquent, tanpa pemanggilan manual di service.
 */
class PopulationAuditObserverTest extends TestCase
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

    public function test_eloquent_writes_are_logged_without_manual_calls(): void
    {
        $this->actingAs($this->staf);

        $family = Family::factory()->create(['village_id' => $this->village->id]);
        $citizen = Citizen::factory()->create(['village_id' => $this->village->id, 'family_id' => $family->id, 'name' => 'Ani']);
        $citizen->update(['name' => 'Ani Lestari']);
        FamilySocioeconomic::query()->create(['family_id' => $family->id, 'dependents_count' => 2]);
        $citizen->delete();
        $family->delete();

        $events = fn (string $logName): array => Activity::query()->where('log_name', $logName)->orderBy('id')->pluck('event')->all();
        $this->assertSame(['created', 'updated', 'deleted'], $events('citizen'));
        $this->assertSame(['created', 'socioeconomic_updated', 'deleted'], $events('family'));
        $this->assertTrue(Activity::query()->get()->every(fn (Activity $log): bool => $log->causer_id === $this->staf->id
            && $log->properties['village_id'] === $this->village->id));
        $this->assertSame(
            ['old' => 'Ani', 'new' => 'Ani Lestari'],
            Activity::query()->where('event', 'updated')->sole()->properties['changes']['name'],
        );
    }

    public function test_writes_without_a_logged_in_user_are_attributed_to_system(): void
    {
        $citizen = Citizen::factory()->create(['village_id' => $this->village->id]);

        $log = Activity::query()->where('subject_id', $citizen->id)->sole();
        $this->assertNull($log->causer_id);
        $this->assertSame('system', $log->properties['actor']);
        $this->assertSame('console', $log->properties['via']);
        $this->assertArrayNotHasKey('source', $log->properties->all());
    }

    public function test_aggregate_scope_writes_one_entry_per_subject(): void
    {
        $citizen = app(AuditContext::class)->muted(fn () => Citizen::factory()->create([
            'village_id' => $this->village->id,
            'name' => 'Budi',
            'marital_status' => 'belum_kawin',
        ]));
        $this->actingAs($this->staf);

        app(AuditContext::class)->with(['event' => 'letter_fulfilled', 'letter_number' => '474/001'], function () use ($citizen): void {
            $citizen->update(['name' => 'Budi Santoso']);
            $citizen->update(['name' => 'Budi Santoso, S.T.', 'marital_status' => 'kawin']);
        }, aggregate: true);

        $log = Activity::query()->sole();
        $this->assertSame('letter_fulfilled', $log->event);
        $this->assertSame('474/001', $log->properties['letter_number']);
        $this->assertSame(['old' => 'Budi', 'new' => 'Budi Santoso, S.T.'], $log->properties['changes']['name']);
        $this->assertSame('kawin', $log->properties['changes']['marital_status']['new']);
    }

    public function test_aggregate_scope_drops_held_entries_when_the_callback_fails(): void
    {
        $citizen = app(AuditContext::class)->muted(fn () => Citizen::factory()->create(['village_id' => $this->village->id]));
        $this->actingAs($this->staf);

        try {
            app(AuditContext::class)->with(['event' => 'letter_fulfilled'], function () use ($citizen): void {
                $citizen->update(['name' => 'Gagal']);

                throw new RuntimeException('Terapkan gagal');
            }, aggregate: true);
        } catch (RuntimeException) {
            // Di aplikasi, transaksinya ikut batal; entri yang ditahan dibuang.
        }

        $this->assertSame(0, Activity::query()->count());
    }

    public function test_muted_scope_skips_audit_but_keeps_saving_hooks(): void
    {
        $citizen = app(AuditContext::class)->muted(fn () => Citizen::factory()->create([
            'village_id' => $this->village->id,
            'nik' => '3201011234560009',
        ]));

        $this->assertSame(0, Activity::query()->count());
        $this->assertSame(hash('sha256', '3201011234560009'), $citizen->nik_hash);
    }

    public function test_demo_seeder_run_on_its_own_does_not_log(): void
    {
        $this->seed([DemoVillageSeeder::class, OccupationSeeder::class, DemoCitizenSeeder::class]);

        $this->assertGreaterThan(0, Citizen::query()->count());
        $this->assertSame(0, Activity::query()->whereIn('log_name', ['citizen', 'family'])->count());
    }
}
