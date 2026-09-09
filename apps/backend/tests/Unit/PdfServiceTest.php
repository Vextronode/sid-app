<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Official;
use App\Models\User;
use App\Repositories\OfficialRepository;
use App\Services\PdfService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class PdfServiceTest extends TestCase
{
    use RefreshDatabase;

    private PdfService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new PdfService(new OfficialRepository);
    }

    public function test_download_blocked_when_letter_not_kasi_approved(): void
    {
        $letter = Letter::factory()->create(['status' => 'pending']);
        $user = User::factory()->create();

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Surat baru dapat diunduh setelah disetujui oleh Operator Desa.');

        $this->service->download($letter, $user);
    }

    public function test_download_blocked_for_warga_when_letter_expired(): void
    {
        $this->markTestSkipped(
            'Menunggu EV5-2/EV5-4: PdfService & LetterStatus masih pakai '.
            'status granular lama (kasi_approved), padahal kolom letters.status '.
            'sekarang CHECK constraint generic sejak EV5-0-S1. Insert dengan '.
            'status granular akan ditolak DB. Test ini perlu ditulis ulang '.
            'begitu service-nya di-rewrite ke status generic.'
        );

        $letter = Letter::factory()->create([
            'status' => 'kasi_approved',
            'expires_at' => now()->subDay(),
        ]);
        $user = User::factory()->create(['role' => 'warga']);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Masa berlaku surat telah habis.');

        $this->service->download($letter, $user);
    }

    public function test_download_succeeds_and_returns_pdf_response(): void
    {
        $this->markTestSkipped(
            'Menunggu EV5-2/EV5-4: PdfService & LetterStatus masih pakai '.
            'status granular lama (kasi_approved), padahal kolom letters.status '.
            'sekarang CHECK constraint generic sejak EV5-0-S1. Insert dengan '.
            'status granular akan ditolak DB. Test ini perlu ditulis ulang '.
            'begitu service-nya di-rewrite ke status generic.'
        );

        $kadesCitizen = Citizen::factory()->create();
        Official::factory()->create([
            'position' => 'kepala_desa',
            'citizen_id' => $kadesCitizen->id,
            'is_active' => true,
            'ended_at' => null,
        ]);

        $letterType = LetterType::factory()->create(['template' => 'Isi surat {{ applicant_name }}']);
        $letter = Letter::factory()->create([
            'status' => 'kasi_approved',
            'letter_type_id' => $letterType->id,
            'expires_at' => now()->addDays(10),
        ]);
        $user = User::factory()->create(['role' => 'petugas_desa']);

        $response = $this->service->download($letter, $user);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function test_download_fails_when_no_active_village_head(): void
    {
        $this->markTestSkipped(
            'Menunggu EV5-2/EV5-4: PdfService & LetterStatus masih pakai '.
            'status granular lama (kasi_approved), padahal kolom letters.status '.
            'sekarang CHECK constraint generic sejak EV5-0-S1. Insert dengan '.
            'status granular akan ditolak DB. Test ini perlu ditulis ulang '.
            'begitu service-nya di-rewrite ke status generic.'
        );

        $letterType = LetterType::factory()->create(['template' => 'Isi surat']);
        $letter = Letter::factory()->create([
            'status' => 'kasi_approved',
            'letter_type_id' => $letterType->id,
        ]);
        $user = User::factory()->create(['role' => 'petugas_desa']);

        $this->expectException(ModelNotFoundException::class);

        $this->service->download($letter, $user);
    }
}
