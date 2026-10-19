<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

/**
 * GET /letters/export: laporan Excel atas scope dan filter daftar surat.
 */
class LetterExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_returns_xlsx_with_only_letters_in_scope_and_filter(): void
    {
        $user = User::factory()->create();
        $type = LetterType::factory()->create(['name' => 'Surat Domisili']);

        Letter::factory()->create([
            'submitted_by' => $user->id,
            'letter_type_id' => $type->id,
            'status' => 'approved',
            'applicant_name' => 'Pemohon Disetujui',
        ]);
        Letter::factory()->create([
            'submitted_by' => $user->id,
            'status' => 'pending',
            'applicant_name' => 'Pemohon Menunggu',
        ]);
        // Surat milik orang lain: di luar scope warga.
        Letter::factory()->create(['status' => 'approved', 'applicant_name' => 'Orang Lain']);

        $response = $this->actingAs($user)->get('/api/letters/export?status=approved');

        $response->assertOk();
        $this->assertStringContainsString('laporan-surat-', $response->headers->get('content-disposition'));

        $rows = $this->rows($response);

        $this->assertSame(['No. Surat', 'Jenis Surat', 'Pemohon', 'Tanggal Diajukan', 'Status', 'Tahap Saat Ini'], $rows[0]);
        $this->assertCount(2, $rows);
        $this->assertSame('Surat Domisili', $rows[1][1]);
        $this->assertSame('Pemohon Disetujui', $rows[1][2]);
        $this->assertSame('Disetujui', $rows[1][4]);
    }

    public function test_export_rejects_an_empty_result(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/letters/export')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Data surat kosong, laporan tidak dapat diunduh.');
    }

    public function test_export_requires_authentication(): void
    {
        $this->getJson('/api/letters/export')->assertUnauthorized();
    }

    /**
     * @return list<list<mixed>>
     */
    private function rows(TestResponse $response): array
    {
        $path = $response->baseResponse->getFile()->getPathname();

        return IOFactory::load($path)->getActiveSheet()->toArray();
    }
}
