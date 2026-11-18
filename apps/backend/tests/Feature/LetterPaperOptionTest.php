<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Official;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use setasign\Fpdi\Fpdi;
use setasign\Fpdi\PdfParser\StreamReader;
use Tests\TestCase;

/**
 * Pilihan kertas saat mengunduh/pratinjau (?paper=a4|f4). PDF dirender di
 * kertas bawaan jenis surat lalu tiap halaman diskalakan utuh ke kertas yang
 * diminta, sehingga jumlah halaman dan tata letaknya tetap.
 */
class LetterPaperOptionTest extends TestCase
{
    use RefreshDatabase;

    private const A4 = [210, 297];

    private const F4 = [215, 330];

    public function test_a4_letter_can_be_downloaded_on_f4_paper(): void
    {
        [$letter, $user] = $this->approvedLetter('a4');

        $response = $this->actingAs($user)
            ->get("/api/letters/{$letter->id}/download?paper=f4")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->assertStringContainsString('attachment', (string) $response->headers->get('content-disposition'));
        $this->assertStringContainsString("surat-{$letter->id}-f4.pdf", (string) $response->headers->get('content-disposition'));
        $this->assertSame([self::F4, self::F4], $this->pageSizes($response->getContent()));
    }

    public function test_f4_letter_can_be_previewed_on_a4_paper_with_the_same_page_count(): void
    {
        [$letter, $user] = $this->approvedLetter('f4');

        $original = $this->actingAs($user)->get("/api/letters/{$letter->id}/preview")->assertOk();
        $this->assertSame([self::F4, self::F4], $this->pageSizes($original->getContent()));

        $response = $this->actingAs($user)
            ->get("/api/letters/{$letter->id}/preview?paper=a4")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->assertStringContainsString('inline', (string) $response->headers->get('content-disposition'));
        $this->assertSame([self::A4, self::A4], $this->pageSizes($response->getContent()));
    }

    public function test_requesting_the_default_paper_keeps_the_original_size(): void
    {
        [$letter, $user] = $this->approvedLetter('f4');

        $response = $this->actingAs($user)
            ->get("/api/letters/{$letter->id}/download?paper=f4")
            ->assertOk();

        $this->assertStringContainsString("surat-{$letter->id}-f4.pdf", (string) $response->headers->get('content-disposition'));
        $this->assertSame([self::F4, self::F4], $this->pageSizes($response->getContent()));
    }

    public function test_unknown_paper_is_rejected(): void
    {
        [$letter, $user] = $this->approvedLetter('a4');

        $this->actingAs($user)
            ->get("/api/letters/{$letter->id}/download?paper=letter")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('paper');
    }

    public function test_supporting_document_can_be_downloaded_on_f4_paper(): void
    {
        [$letter, $user] = $this->approvedLetter('a4', ['supporting_template' => 'Pernyataan {{ applicant_name }}']);

        $response = $this->actingAs($user)
            ->get("/api/letters/{$letter->id}/supporting-document?download=1&paper=f4")
            ->assertOk();

        $this->assertStringContainsString("dokumen-pendukung-{$letter->id}-f4.pdf", (string) $response->headers->get('content-disposition'));
        $this->assertSame([self::F4], $this->pageSizes($response->getContent()));
    }

    public function test_letter_detail_lists_the_default_paper_of_each_document(): void
    {
        [$letter, $user] = $this->approvedLetter('f4');

        $this->actingAs($user)
            ->getJson("/api/letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('data.documents.0.key', 'main')
            ->assertJsonPath('data.documents.0.paper', 'f4');
    }

    /**
     * Surat terbit dua halaman di kertas $paper.
     *
     * @return array{0: Letter, 1: User}
     */
    private function approvedLetter(string $paper, array $typeAttributes = []): array
    {
        Official::factory()->create([
            'position' => 'kepala_desa',
            'citizen_id' => Citizen::factory()->create()->id,
            'is_active' => true,
            'ended_at' => null,
        ]);
        $letterType = LetterType::factory()->create([
            'template' => 'Halaman satu {{ applicant_name }}<div style="page-break-before: always;"></div>Halaman dua',
            'paper_size' => $paper,
            ...$typeAttributes,
        ]);
        $letter = Letter::factory()->create([
            'status' => 'approved',
            'letter_type_id' => $letterType->id,
            'expires_at' => now()->addDays(10),
        ]);

        return [$letter, $this->makeUserWithOfficialAssignment('staf_sid', 'staf_sid', $letter->village_id)];
    }

    /**
     * @return array<int, array{0: int, 1: int}> lebar x tinggi tiap halaman (mm)
     */
    private function pageSizes(string $pdf): array
    {
        $reader = new Fpdi('P', 'mm');
        $count = $reader->setSourceFile(StreamReader::createByString($pdf));
        $sizes = [];

        for ($page = 1; $page <= $count; $page++) {
            $size = $reader->getTemplateSize($reader->importPage($page));
            $sizes[] = [(int) round($size['width']), (int) round($size['height'])];
        }

        return $sizes;
    }
}
