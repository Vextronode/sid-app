<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Temuan #14: penolakan data desa lain dibuat seragam.
 *
 * - Data desa lain yang ditunjuk di URL -> 404 (keberadaannya tidak
 *   dibocorkan), untuk lihat, ubah, maupun hapus.
 * - Id desa lain di isi request -> 422 dengan error pada field-nya, karena
 *   itu kesalahan input.
 */
class CrossVillageStatusTest extends TestCase
{
    use RefreshDatabase;

    private User $staf;

    private Village $otherVillage;

    protected function setUp(): void
    {
        parent::setUp();

        $this->staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => Village::factory()->create()->id]);
        $this->otherVillage = Village::factory()->create();
    }

    public function test_records_of_another_village_in_the_url_are_not_found(): void
    {
        $hamlet = Hamlet::factory()->create(['village_id' => $this->otherVillage->id]);
        $rw = Rw::factory()->create(['hamlet_id' => $hamlet->id]);
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $citizen = Citizen::factory()->create(['village_id' => $this->otherVillage->id, 'rt_id' => $rt->id]);
        $family = Family::factory()->create(['village_id' => $this->otherVillage->id, 'rt_id' => $rt->id]);

        $requests = [
            ['patch', "/api/hamlets/{$hamlet->id}", ['name' => 'Baru']],
            ['delete', "/api/hamlets/{$hamlet->id}", []],
            ['patch', "/api/rws/{$rw->id}", ['number' => '009']],
            ['delete', "/api/rws/{$rw->id}", []],
            ['patch', "/api/rts/{$rt->id}", ['number' => '009']],
            ['delete', "/api/rts/{$rt->id}", []],
            ['patch', "/api/citizens/{$citizen->id}", ['name' => 'Baru']],
            ['delete', "/api/citizens/{$citizen->id}", []],
            ['get', "/api/families/{$family->id}", []],
            ['patch', "/api/families/{$family->id}", ['family_address' => 'Baru']],
            ['delete', "/api/families/{$family->id}", []],
        ];

        foreach ($requests as [$method, $uri, $payload]) {
            $this->actingAs($this->staf)->json($method, $uri, $payload)->assertNotFound();
        }

        // Tidak ada yang berubah atau terhapus di desa lain.
        $this->assertModelExists($citizen);
        $this->assertNotSame('Baru', $citizen->fresh()->name);
        $this->assertModelExists($hamlet);
    }

    public function test_ids_of_another_village_in_the_request_body_fail_validation(): void
    {
        $hamlet = Hamlet::factory()->create(['village_id' => $this->otherVillage->id]);
        $rw = Rw::factory()->create(['hamlet_id' => $hamlet->id]);

        $this->actingAs($this->staf)
            ->postJson('/api/rws', ['hamlet_id' => $hamlet->id, 'number' => '001'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['hamlet_id' => 'Dusun harus berasal dari desa Anda.']);

        $this->actingAs($this->staf)
            ->postJson('/api/rts', ['rw_id' => $rw->id, 'number' => '001'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['rw_id' => 'RW harus berasal dari desa Anda.']);
    }
}
