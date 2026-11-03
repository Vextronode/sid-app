<?php

namespace Tests\Feature;

use App\Exports\CitizensTemplateExport;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
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

        $sheet = IOFactory::load($response->baseResponse->getFile()->getPathname())->getActiveSheet();
        $rows = $sheet->toArray();

        $this->assertSame(CitizensTemplateExport::HEADINGS, $rows[0]);
        $this->assertCount(count(CitizensTemplateExport::HEADINGS), $rows[1]);

        // Kolom NIK berformat Teks dan contoh NIK tersimpan sebagai teks,
        // agar digit ke-16 tidak dibulatkan Excel.
        $nik = $sheet->getCell(CitizensTemplateExport::nikColumn().'2');
        $this->assertSame('A', CitizensTemplateExport::nikColumn());
        $this->assertSame(NumberFormat::FORMAT_TEXT, $nik->getStyle()->getNumberFormat()->getFormatCode());
        $this->assertSame(DataType::TYPE_STRING, $nik->getDataType());
        $this->assertSame('3201010101900001', $nik->getValue());
        // Seluruh kolom, termasuk baris yang nanti diketik petugas.
        $columnStyle = $sheet->getParent()->getCellXfByIndex($sheet->getColumnDimension('A')->getXfIndex());
        $this->assertSame(NumberFormat::FORMAT_TEXT, $columnStyle->getNumberFormat()->getFormatCode());
        $this->assertSame(NumberFormat::FORMAT_GENERAL, $sheet->getStyle('B2')->getNumberFormat()->getFormatCode());
    }

    public function test_other_roles_cannot_download_the_template(): void
    {
        $warga = User::factory()->create(['role' => 'warga']);

        $this->actingAs($warga)
            ->getJson('/api/citizens/import-template')
            ->assertForbidden();
    }
}
