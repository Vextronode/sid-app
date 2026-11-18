<?php

namespace Tests\Feature;

use App\Models\LetterType;
use App\Models\User;
use App\Models\Village;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Database\Seeders\ApprovalFlowSeeder;
use Database\Seeders\LetterTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
use Mockery;
use setasign\Fpdi\Fpdi;
use setasign\Fpdi\PdfParser\StreamReader;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Formulir isi tangan (letter_types.handwritten_forms) yang diunduh pemohon
 * sebelum mengajukan, mis. Surat Pernyataan Ijin Lingkungan dan Surat
 * Pernyataan bermaterai pada A12. Identitas pemohon terisi dari data
 * penduduk; sisanya ditulis tangan.
 */
class HandwrittenFormTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create([
            'name' => 'Desa Sukamaju',
            'district' => 'Cijulang',
            'regency' => 'Pangandaran',
        ]);
        $this->seed([ApprovalFlowSeeder::class, LetterTypeSeeder::class]);

        ['rt' => $rt] = $this->makeArea($this->village);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'name' => 'Budi Santoso',
            'nik' => '3207010101800001',
            'gender' => 'L',
            'place_of_birth' => 'Ciamis',
            'date_of_birth' => '1980-01-01',
            'marital_status' => 'kawin',
            'religion' => 'islam',
            'address' => 'Dusun Sukamaju RT 001/RW 002',
        ]);
    }

    public function test_statement_form_is_prefilled_with_the_applicant_identity_on_f4_paper(): void
    {
        $html = $this->render('pernyataan', $paper);

        foreach (['SURAT PERNYATAAN', 'Budi Santoso', 'Ciamis, 01 Januari 1980', 'Laki-laki', 'Kawin', 'Islam', 'Dusun Sukamaju RT 001/RW 002', 'Kabupaten Pangandaran', 'Materai 10.000', $this->applicant['user']->email] as $value) {
            $this->assertStringContainsString($value, $html);
        }
        // Tanggal dan nomor HP ditulis tangan; tidak ada placeholder tersisa.
        $this->assertStringNotContainsString('{{', $html);
        $this->assertSame([0.0, 0.0, 609.45, 935.43], $paper);
    }

    public function test_consent_list_has_two_sheets_and_only_the_applicant_is_prefilled(): void
    {
        $html = $this->render('daftar');

        $this->assertStringContainsString('SURAT PERNYATAAN IJIN LINGKUNGAN', $html);
        $this->assertStringContainsString('Budi Santoso', $html);
        $this->assertStringContainsString('3207010101800001', $html);
        $this->assertStringContainsString('Desa Sukamaju Kecamatan Cijulang', $html);
        // Satu dokumen dua lembar: 20 baris + 11 baris lanjutan.
        $this->assertSame(1, substr_count($html, 'page-break-before: always'));
        $this->assertStringContainsString('>31</td>', $html);
        $this->assertStringContainsString('Kepala Dusun', $html);
        $this->assertStringNotContainsString('{{', $html);
    }

    public function test_only_accounts_that_can_submit_letters_may_download(): void
    {
        $type = $this->letterType();

        $this->getJson("/api/letter-types/{$type->id}/forms/pernyataan")->assertUnauthorized();

        // Tanpa data penduduk (mis. Staf SIDUTama) tidak dapat mengajukan surat.
        $staff = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id, 'citizen_id' => null]);
        $this->actingAs($staff)->getJson("/api/letter-types/{$type->id}/forms/pernyataan")->assertForbidden();

        // Desa lain.
        $otherVillage = Village::factory()->create();
        ['rt' => $otherRt] = $this->makeArea($otherVillage);
        $outsider = $this->makeCitizenAccount($otherVillage, $otherRt);
        $this->actingAs($outsider['user'])->getJson("/api/letter-types/{$type->id}/forms/pernyataan")->assertNotFound();
    }

    public function test_unknown_form_or_inactive_type_is_not_found(): void
    {
        $type = $this->letterType();
        $user = $this->applicant['user'];

        $this->actingAs($user)->getJson("/api/letter-types/{$type->id}/forms/tidak-ada")->assertNotFound();

        $type->update(['is_active' => false]);
        $this->actingAs($user)->getJson("/api/letter-types/{$type->id}/forms/pernyataan")->assertNotFound();
    }

    public function test_letter_type_lists_its_forms_without_the_template(): void
    {
        $forms = collect($this->actingAs($this->applicant['user'])->getJson('/api/letter-types')->assertOk()->json('data'))
            ->firstWhere('code', 'A12')['handwritten_forms'];

        $this->assertSame(['daftar', 'pernyataan'], array_column($forms, 'key'));
        $this->assertArrayNotHasKey('template', $forms[0]);

        $public = collect($this->getJson('/api/public/letter-types')->assertOk()->json('data'))->firstWhere('code', 'A12');
        $this->assertSame(['daftar', 'pernyataan'], array_column($public['handwritten_forms'], 'key'));
    }

    public function test_f4_form_can_be_downloaded_on_a4_paper(): void
    {
        $response = $this->actingAs($this->applicant['user'])
            ->get("/api/letter-types/{$this->letterType()->id}/forms/pernyataan?download=1&paper=a4")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->assertStringContainsString('formulir-a12-pernyataan-a4.pdf', (string) $response->headers->get('content-disposition'));

        $reader = new Fpdi('P', 'mm');
        $reader->setSourceFile(StreamReader::createByString($response->getContent()));
        $size = $reader->getTemplateSize($reader->importPage(1));
        $this->assertSame([210, 297], [(int) round($size['width']), (int) round($size['height'])]);
    }

    private function letterType(): LetterType
    {
        return LetterType::query()->where('village_id', $this->village->id)->where('code', 'A12')->firstOrFail();
    }

    private function render(string $key, mixed &$paper = null): string
    {
        $rendered = null;
        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('setPaper')->once()->andReturnUsing(function (mixed $size) use (&$paper, $pdf) {
            $paper = $size;

            return $pdf;
        });
        $pdf->shouldReceive('download')->once()->andReturn(new Response('', 200));
        Pdf::shouldReceive('loadView')
            ->once()
            ->with('pdf.templates.letter', Mockery::on(function (array $data) use (&$rendered): bool {
                $rendered = $data['template'];

                return true;
            }))
            ->andReturn($pdf);

        $this->actingAs($this->applicant['user'])
            ->get("/api/letter-types/{$this->letterType()->id}/forms/{$key}?download=1")
            ->assertOk();

        return $rendered;
    }
}
