<?php

namespace Tests\Unit;

use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Village;
use App\Repositories\LetterNumberCounterRepository;
use App\Services\LetterNumberGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LetterNumberGeneratorTest extends TestCase
{
    use RefreshDatabase;

    private LetterNumberGenerator $generator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->generator = new LetterNumberGenerator(new LetterNumberCounterRepository);
    }

    public function test_generates_sequential_numbers_in_the_village_office_format(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3));
        $letter = $this->makeLetter('470');

        DB::transaction(function () use ($letter) {
            $this->assertSame('470/001/Des/X/2026', $this->generator->next($letter));
            $this->assertSame('470/002/Des/X/2026', $this->generator->next($letter));
        });
    }

    public function test_letter_types_sharing_a_classification_code_share_one_sequence(): void
    {
        $village = Village::factory()->create();
        $first = $this->makeLetter('470', $village);
        $second = $this->makeLetter('470', $village);
        $income = $this->makeLetter('510', $village);

        $this->travelTo(now()->setDate(2026, 12, 31));
        DB::transaction(function () use ($first, $second, $income) {
            // Jenis surat berbeda dengan kode klasifikasi sama tidak boleh
            // menghasilkan nomor yang sama.
            $this->assertSame('470/001/Des/XII/2026', $this->generator->next($first));
            $this->assertSame('470/002/Des/XII/2026', $this->generator->next($second));
            $this->assertSame('510/001/Des/XII/2026', $this->generator->next($income));
        });

        $this->travelTo(now()->setDate(2027, 1, 1));
        DB::transaction(function () use ($first) {
            $this->assertSame('470/001/Des/I/2027', $this->generator->next($first));
        });
    }

    public function test_sequences_are_separate_per_village(): void
    {
        $this->travelTo(now()->setDate(2026, 3, 1));
        $first = $this->makeLetter('470', Village::factory()->create());
        $second = $this->makeLetter('470', Village::factory()->create());

        DB::transaction(function () use ($first, $second) {
            $this->assertSame('470/001/Des/III/2026', $this->generator->next($first));
            $this->assertSame('470/001/Des/III/2026', $this->generator->next($second));
        });
    }

    private function makeLetter(string $classificationCode, ?Village $village = null): Letter
    {
        $village ??= Village::factory()->create();
        $type = LetterType::factory()->create(['classification_code' => $classificationCode]);

        return Letter::factory()->create([
            'village_id' => $village->id,
            'letter_type_id' => $type->id,
        ]);
    }
}
