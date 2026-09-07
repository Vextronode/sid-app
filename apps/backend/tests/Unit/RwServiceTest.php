<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Rw;
use App\Repositories\CitizenRepository;
use App\Repositories\RwRepository;
use App\Services\RwService;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RwServiceTest extends TestCase
{
    use RefreshDatabase;

    private RwService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new RwService(
            new RwRepository,
            new CitizenRepository,
        );
    }

    public function test_create_generates_full_label_from_number(): void
    {
        $hamlet = Hamlet::factory()->create();

        $rw = $this->service->create(['hamlet_id' => $hamlet->id, 'number' => '005']);

        $this->assertSame('RW 005', $rw->full_label);
        $this->assertTrue($rw->is_active);
    }

    public function test_update_regenerates_full_label_when_number_changes(): void
    {
        $rw = Rw::factory()->create(['number' => '001', 'full_label' => 'RW 001']);

        $updated = $this->service->update($rw, ['number' => '009']);

        $this->assertSame('RW 009', $updated->full_label);
    }

    public function test_update_blocks_deactivation_when_active_citizens_exist(): void
    {
        $rw = Rw::factory()->create(['is_active' => true]);
        Citizen::factory()->create(['rw_id' => $rw->id, 'is_active' => true]);

        $this->expectException(HttpException::class);

        $this->service->update($rw, ['is_active' => false]);
    }

    public function test_delete_is_blocked_when_citizens_still_registered(): void
    {
        $rw = Rw::factory()->create();
        Citizen::factory()->create(['rw_id' => $rw->id]);

        $this->expectException(HttpException::class);

        $this->service->delete($rw);
    }

    public function test_delete_removes_rw_without_citizens(): void
    {
        $rw = Rw::factory()->create();

        $result = $this->service->delete($rw);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('rws', ['id' => $rw->id]);
    }
}
