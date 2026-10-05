<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\LetterApproval;
use App\Models\LetterType;
use App\Models\Official;
use App\Models\User;
use App\Models\Village;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;
use App\Services\PdfService;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response as LaravelResponse;
use Mockery;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class PdfServiceTest extends TestCase
{
    use RefreshDatabase;

    private PdfService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new PdfService(new OfficialRepository, new LetterRepository);
    }

    public function test_download_blocked_when_letter_not_approved(): void
    {
        $letter = Letter::factory()->create(['status' => 'pending']);
        $user = User::factory()->create();

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Surat baru dapat diunduh setelah seluruh proses persetujuan selesai.');

        $this->service->download($letter, $user);
    }

    public function test_download_blocked_for_warga_when_letter_expired(): void
    {
        $user = User::factory()->create(['role' => 'warga']);
        $letter = Letter::factory()->create([
            'status' => 'approved',
            'submitted_by' => $user->id,
            'expires_at' => now()->subDay(),
        ]);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Masa berlaku surat telah habis.');

        $this->service->download($letter, $user);
    }

    public function test_download_blocked_for_any_applicant_role_when_letter_expired(): void
    {
        $user = User::factory()->create(['role' => 'petugas_desa']);
        $letter = Letter::factory()->create([
            'status' => 'approved',
            'submitted_by' => $user->id,
            'expires_at' => now()->subDay(),
        ]);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Masa berlaku surat telah habis.');

        $this->service->download($letter, $user);
    }

    public function test_download_succeeds_and_returns_pdf_response(): void
    {
        $village = Village::factory()->create();
        $kadesCitizen = Citizen::factory()->create(['village_id' => $village->id]);
        Official::factory()->create([
            'position' => 'kepala_desa',
            'village_id' => $village->id,
            'citizen_id' => $kadesCitizen->id,
            'is_active' => true,
            'ended_at' => null,
        ]);

        $letterType = LetterType::factory()->create(['template' => 'Isi surat {{ applicant_name }}']);
        $letter = Letter::factory()->create([
            'status' => 'approved',
            'village_id' => $village->id,
            'letter_type_id' => $letterType->id,
            'expires_at' => now()->addDays(10),
        ]);
        $user = User::factory()->create(['role' => 'petugas_desa']);

        $response = $this->service->download($letter, $user);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function test_download_fails_when_no_active_village_head(): void
    {
        $letterType = LetterType::factory()->create(['template' => 'Isi surat']);
        $letter = Letter::factory()->create([
            'status' => 'approved',
            'letter_type_id' => $letterType->id,
        ]);
        $user = User::factory()->create(['role' => 'petugas_desa']);

        $this->expectException(ModelNotFoundException::class);

        $this->service->download($letter, $user);
    }

    public function test_sekdes_approved_letter_still_uses_active_kades_for_signature(): void
    {
        $otherVillage = Village::factory()->create();
        $otherKadesCitizen = Citizen::factory()->create(['village_id' => $otherVillage->id]);
        Official::factory()->create([
            'position' => 'kepala_desa',
            'village_id' => $otherVillage->id,
            'citizen_id' => $otherKadesCitizen->id,
            'is_active' => true,
            'ended_at' => null,
        ]);

        $village = Village::factory()->create();
        $kadesCitizen = Citizen::factory()->create(['village_id' => $village->id]);
        $kades = Official::factory()->create([
            'position' => 'kepala_desa',
            'village_id' => $village->id,
            'citizen_id' => $kadesCitizen->id,
            'is_active' => true,
            'ended_at' => null,
        ]);
        $sekdes = User::factory()->create(['role' => 'sekretaris_desa', 'village_id' => $village->id]);
        $letterType = LetterType::factory()->create(['template' => 'Isi surat']);
        $letter = Letter::factory()->create([
            'status' => 'approved',
            'village_id' => $village->id,
            'letter_type_id' => $letterType->id,
        ]);
        LetterApproval::query()->create([
            'letter_id' => $letter->id,
            'approved_by' => $sekdes->id,
            'approval_level' => 'sekdes',
            'action' => 'approved',
        ]);

        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('download')->once()->andReturn(new LaravelResponse);
        Pdf::shouldReceive('loadView')
            ->once()
            ->with('pdf.templates.wet', Mockery::on(
                fn (array $data): bool => $data['kades']->is($kades),
            ))
            ->andReturn($pdf);

        $this->service->download($letter, User::factory()->create(['role' => 'petugas_desa']));
    }
}
