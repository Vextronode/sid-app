<?php

namespace Tests\Feature;

use App\Models\ApprovalFlow;
use App\Models\ApprovalSetting;
use App\Models\Citizen;
use App\Models\LetterExpiryReminderSetting;
use App\Models\LetterType;
use App\Models\NewsCategory;
use App\Models\Occupation;
use App\Models\OfficialPositionType;
use App\Models\User;
use App\Models\Village;
use App\Models\VillageOrgPosition;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoDataSeeder;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;
use Tests\TestCase;

/**
 * Pemisahan seeder: data acuan tidak bergantung pada data demo; data demo
 * dan db:seed menolak production.
 */
class ReferenceDataSeederTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function database_seeder_refuses_production_without_touching_the_installed_village(): void
    {
        $village = Village::factory()->create();
        $this->app['env'] = 'production';

        try {
            $this->runSeeder(DatabaseSeeder::class);
            $this->fail('DatabaseSeeder seharusnya menolak production.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('sid:install', $exception->getMessage());
        }

        $this->assertSame(1, Village::query()->count());
        $this->assertFalse(LetterType::query()->where('village_id', $village->id)->exists());
        $this->assertSame(0, Citizen::query()->count());
        $this->assertSame(0, User::query()->count());
    }

    #[Test]
    public function reference_data_seeder_fills_reference_data_in_production(): void
    {
        $village = Village::factory()->create();
        $this->app['env'] = 'production';

        $this->runSeeder(ReferenceDataSeeder::class);

        $this->assertReferenceDataSeeded($village);
        $this->assertSame(0, Citizen::query()->count());
    }

    #[Test]
    public function reference_data_seeder_is_idempotent(): void
    {
        $village = Village::factory()->create();
        $this->seed(ReferenceDataSeeder::class);

        $counts = fn () => [
            OfficialPositionType::query()->count(),
            NewsCategory::query()->count(),
            Occupation::query()->count(),
            ApprovalFlow::query()->count(),
            ApprovalSetting::query()->count(),
            LetterExpiryReminderSetting::query()->count(),
            LetterType::query()->count(),
            VillageOrgPosition::query()->count(),
        ];
        $before = $counts();

        $this->seed(ReferenceDataSeeder::class);

        $this->assertSame($before, $counts());
        $this->assertReferenceDataSeeded($village);
    }

    #[Test]
    public function reference_data_seeder_does_nothing_without_a_village(): void
    {
        $this->seed(ReferenceDataSeeder::class);

        $this->assertSame(0, LetterType::query()->count());
        $this->assertSame(0, Occupation::query()->count());
    }

    #[Test]
    public function demo_data_seeder_refuses_production(): void
    {
        $this->app['env'] = 'production';

        try {
            $this->runSeeder(DemoDataSeeder::class);
            $this->fail('Seeder demo seharusnya menolak production.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Demo seeders must not be run in production.', $exception->getMessage());
        }

        $this->assertSame(0, Village::query()->count());
    }

    /**
     * Menjalankan seeder tanpa perintah db:seed, yang meminta konfirmasi
     * di production.
     */
    private function runSeeder(string $class): void
    {
        $this->app->make($class)->setContainer($this->app)->__invoke();
    }

    private function assertReferenceDataSeeded(Village $village): void
    {
        foreach ([
            OfficialPositionType::class,
            NewsCategory::class,
            Occupation::class,
            ApprovalFlow::class,
            ApprovalSetting::class,
            LetterExpiryReminderSetting::class,
            LetterType::class,
            VillageOrgPosition::class,
        ] as $model) {
            $this->assertTrue(
                $model::query()->where('village_id', $village->id)->exists(),
                "Data acuan {$model} belum terisi untuk desa.",
            );
        }
    }
}
