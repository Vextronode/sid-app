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

    public function test_generates_sequential_formatted_numbers(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3));
        $letter = $this->makeLetter('domisili');

        DB::transaction(function () use ($letter) {
            $this->assertSame('001/DOMISILI/2026', $this->generator->next($letter));
            $this->assertSame('002/DOMISILI/2026', $this->generator->next($letter));
        });
    }

    public function test_counters_are_separate_by_year_and_letter_type(): void
    {
        $village = Village::factory()->create();
        $firstType = LetterType::factory()->create(['code' => 'SKTM']);
        $secondType = LetterType::factory()->create(['code' => 'DOM']);
        $firstLetter = Letter::factory()->create([
            'village_id' => $village->id,
            'letter_type_id' => $firstType->id,
        ]);
        $secondLetter = Letter::factory()->create([
            'village_id' => $village->id,
            'letter_type_id' => $secondType->id,
        ]);

        $this->travelTo(now()->setDate(2026, 12, 31));
        DB::transaction(function () use ($firstLetter, $secondLetter) {
            $this->assertSame('001/SKTM/2026', $this->generator->next($firstLetter));
            $this->assertSame('001/DOM/2026', $this->generator->next($secondLetter));
        });

        $this->travelTo(now()->setDate(2027, 1, 1));
        DB::transaction(function () use ($firstLetter) {
            $this->assertSame('001/SKTM/2027', $this->generator->next($firstLetter));
        });
    }

    private function makeLetter(string $code): Letter
    {
        $type = LetterType::factory()->create(['code' => $code]);

        return Letter::factory()->create(['letter_type_id' => $type->id]);
    }
}
