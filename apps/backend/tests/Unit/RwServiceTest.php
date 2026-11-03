<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Repositories\CitizenRepository;
use App\Repositories\RwRepository;
use App\Services\RwService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
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

    public function test_create_stores_the_number(): void
    {
        $hamlet = Hamlet::factory()->create();

        $rw = $this->service->create(['hamlet_id' => $hamlet->id, 'number' => '005'], $this->makeStafSidActor($hamlet->village_id));

        $this->assertSame('005', $rw->number);
        $this->assertTrue($rw->is_active);
    }

    public function test_update_changes_the_number(): void
    {
        $rw = Rw::factory()->create(['number' => '001']);

        $updated = $this->service->update($rw, ['number' => '009'], $this->makeStafSidActor($rw->village_id));

        $this->assertSame('009', $updated->number);
    }

    public function test_update_blocks_deactivation_when_active_citizens_exist(): void
    {
        $rw = Rw::factory()->create(['is_active' => true]);
        Citizen::factory()->create(['rt_id' => Rt::factory()->create(['rw_id' => $rw->id])->id, 'is_active' => true]);

        $this->expectException(HttpException::class);

        $this->service->update($rw, ['is_active' => false], $this->makeStafSidActor($rw->village_id));
    }

    public function test_delete_is_blocked_when_citizens_still_registered(): void
    {
        $rw = Rw::factory()->create();
        Citizen::factory()->create(['rt_id' => Rt::factory()->create(['rw_id' => $rw->id])->id]);

        $this->expectException(HttpException::class);

        $this->service->delete($rw, $this->makeStafSidActor($rw->village_id));
    }

    public function test_delete_removes_rw_without_citizens(): void
    {
        $rw = Rw::factory()->create();

        $result = $this->service->delete($rw, $this->makeStafSidActor($rw->village_id));

        $this->assertTrue($result);
        $this->assertDatabaseMissing('rws', ['id' => $rw->id]);
    }
}
