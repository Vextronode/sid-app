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
use App\Services\LetterSignatureService;
use App\Services\LetterSnapshotService;
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

        $this->service = new PdfService(
            new LetterRepository,
            new LetterSnapshotService(new OfficialRepository, new LetterRepository),
            app(LetterSignatureService::class),
        );
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
        $user = User::factory()->create(['role' => 'staf_sid']);
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
        $user = User::factory()->create(['role' => 'staf_sid']);

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
        $user = User::factory()->create(['role' => 'staf_sid']);

        $this->expectException(ModelNotFoundException::class);

        $this->service->download($letter, $user);
    }

    public function test_sekdes_approved_letter_prints_the_active_kades_name(): void
    {
        $otherVillage = Village::factory()->create();
        Official::factory()->create([
            'position' => 'kepala_desa',
            'village_id' => $otherVillage->id,
            'citizen_id' => Citizen::factory()->create(['village_id' => $otherVillage->id])->id,
            'is_active' => true,
            'ended_at' => null,
        ]);

        [$letter, , $kadesName] = $this->makeLetter('approved', '{{ village_head_name }}');
        $sekdes = User::factory()->create(['role' => 'sekretaris_desa', 'village_id' => $letter->village_id]);
        LetterApproval::query()->create([
            'letter_id' => $letter->id,
            'approved_by' => $sekdes->id,
            'approval_level' => 'sekretaris_desa',
            'action' => 'approved',
        ]);

        $this->expectTemplate('download', fn (string $template): bool => $template === e($kadesName));

        $this->service->download($letter, User::factory()->create(['role' => 'staf_sid']));
    }

    public function test_issued_letter_leaves_every_signature_area_empty_for_wet_signing(): void
    {
        [$letter, $applicant] = $this->makeLetter('approved', '{{ signature_img }}{{ tanda_tangan_kepala_desa }}{{ tanda_tangan_pemohon }}{{ ttd_saksi }}');

        $this->expectTemplate('download', fn (string $template): bool => $template === '');

        $this->service->download($letter, $applicant);
    }

    public function test_applicant_cannot_preview_before_the_letter_is_issued(): void
    {
        [$letter, $applicant] = $this->makeLetter('in_progress');

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Pratinjau surat tersedia setelah surat terbit.');

        $this->service->preview($letter, $applicant);
    }

    public function test_approver_previews_before_and_applicant_after_the_letter_is_issued(): void
    {
        [$letter, $applicant, $kadesName] = $this->makeLetter('in_progress', '{{ village_head_name }}');
        $rt = User::factory()->create(['role' => 'rt', 'village_id' => $letter->village_id]);

        $this->expectTemplate('stream', fn (string $template): bool => $template === e($kadesName));
        $this->service->preview($letter, $rt);

        $letter->update(['status' => 'approved']);
        $this->expectTemplate('stream', fn (string $template): bool => $template === e($kadesName));
        $this->service->preview($letter->fresh(), $applicant);
    }

    /**
     * @return array{0: Letter, 1: User, 2: string} surat, pemohon, nama Kepala Desa
     */
    private function makeLetter(string $status, string $template = 'Isi surat'): array
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
        $applicant = User::factory()->create(['role' => 'warga', 'village_id' => $village->id]);
        $letter = Letter::factory()->create([
            'status' => $status,
            'village_id' => $village->id,
            'submitted_by' => $applicant->id,
            'letter_type_id' => LetterType::factory()->create(['template' => $template])->id,
            'expires_at' => now()->addDays(10),
        ]);

        return [$letter, $applicant, (string) $kadesCitizen->name];
    }

    private function expectTemplate(string $output, callable $matches): void
    {
        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive($output)->once()->andReturn(new LaravelResponse);
        Pdf::shouldReceive('loadView')
            ->once()
            ->with('pdf.templates.letter', Mockery::on(fn (array $data): bool => $matches($data['template'])))
            ->andReturn($pdf);
    }
}
