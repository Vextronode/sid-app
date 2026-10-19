<?php

namespace Tests\Feature;

use App\Exports\CitizensTemplateExport;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

/**
 * GET /citizens/import-template: file .xlsx asli (bukan HTML) dengan
 * header yang diterima POST /citizens/import.
 */
class CitizenImportTemplateTest extends TestCase
{
    use RefreshDatabase;

    public function test_petugas_downloads_a_readable_template_with_import_headers(): void
    {
        $village = Village::factory()->create();
        $petugas = User::factory()->create(['role' => 'staf_sid', 'village_id' => $village->id]);

        $response = $this->actingAs($petugas)->get('/api/citizens/import-template');

        $response->assertOk();
        $this->assertStringContainsString('template_impor_warga.xlsx', $response->headers->get('content-disposition'));

        $rows = IOFactory::load($response->baseResponse->getFile()->getPathname())
            ->getActiveSheet()
            ->toArray();

        $this->assertSame(CitizensTemplateExport::HEADINGS, $rows[0]);
        $this->assertCount(count(CitizensTemplateExport::HEADINGS), $rows[1]);
    }

    public function test_other_roles_cannot_download_the_template(): void
    {
        $warga = User::factory()->create(['role' => 'warga']);

        $this->actingAs($warga)
            ->getJson('/api/citizens/import-template')
            ->assertForbidden();
    }
}
