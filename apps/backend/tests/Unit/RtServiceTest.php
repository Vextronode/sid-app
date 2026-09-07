<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Rt;
use App\Models\Rw;
use App\Repositories\CitizenRepository;
use App\Repositories\RtRepository;
use App\Repositories\RwRepository;
use App\Services\RtService;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RtServiceTest extends TestCase
{
    use RefreshDatabase;

    private RtService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new RtService(
            new RtRepository,
            new RwRepository,
            new CitizenRepository,
        );
    }

    public function test_create_generates_full_label_using_rw_number(): void
    {
        $rw = Rw::factory()->create(['number' => '007']);

        $rt = $this->service->create(['rw_id' => $rw->id, 'number' => '003']);

        $this->assertSame('RT 003 / RW 007', $rt->full_label);
        $this->assertTrue($rt->is_active);
    }

    public function test_update_regenerates_full_label_when_number_changes(): void
    {
        $rw = Rw::factory()->create(['number' => '001']);
        $rt = Rt::factory()->create(['rw_id' => $rw->id, 'number' => '001', 'full_label' => 'RT 001 / RW 001']);

        $updated = $this->service->update($rt, ['number' => '005']);

        $this->assertSame('RT 005 / RW 001', $updated->full_label);
    }

    public function test_update_blocks_deactivation_when_active_citizens_exist(): void
    {
        $rt = Rt::factory()->create(['is_active' => true]);
        Citizen::factory()->create(['rt_id' => $rt->id, 'is_active' => true]);

        $this->expectException(HttpException::class);

        $this->service->update($rt, ['is_active' => false]);
    }

    public function test_delete_is_blocked_when_citizens_still_registered(): void
    {
        $rt = Rt::factory()->create();
        Citizen::factory()->create(['rt_id' => $rt->id]);

        $this->expectException(HttpException::class);

        $this->service->delete($rt);
    }

    public function test_delete_removes_rt_without_citizens(): void
    {
        $rt = Rt::factory()->create();

        $result = $this->service->delete($rt);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('rts', ['id' => $rt->id]);
    }
}
