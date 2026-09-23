<?php

namespace Tests\Unit;

use App\Models\ApprovalSetting;
use App\Models\Village;
use App\Repositories\ApprovalSettingRepository;
use App\Services\ApprovalSettingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-9-S2 — Unit test untuk ApprovalSettingService::resolveDeadline(),
 * titik tunggal yang menggantikan hardcode now()->addDays(n) yang
 * sebelumnya tersebar di LetterService::createFirstApproval() dan
 * RtApprovalService::decision().
 */
class ApprovalSettingServiceTest extends TestCase
{
    use RefreshDatabase;

    private ApprovalSettingService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new ApprovalSettingService(new ApprovalSettingRepository);
    }

    #[Test]
    public function resolve_deadline_uses_configured_hours_when_setting_exists(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);

        ApprovalSetting::create([
            'village_id' => $village->id,
            'approval_level' => 'kasi_pelayanan',
            'deadline_hours' => 48,
            'reminder_hours' => 24,
        ]);

        $deadline = $this->service->resolveDeadline('kasi_pelayanan', $village->id);

        $this->assertEqualsWithDelta(
            now()->addHours(48)->timestamp,
            $deadline->timestamp,
            2,
        );
    }

    #[Test]
    public function resolve_deadline_falls_back_to_24_hours_when_setting_missing(): void
    {
        $village = Village::create(['name' => 'Desa Cibenda', 'code' => 'CBD']);

        $deadline = $this->service->resolveDeadline('rt', $village->id);

        $this->assertEqualsWithDelta(
            now()->addHours(24)->timestamp,
            $deadline->timestamp,
            2,
        );
    }
}
