<?php

namespace Tests\Unit;

use App\Models\Official;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class OfficialModelTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function active_scope_excludes_inactive_officials(): void
    {
        $active = Official::factory()->create(['is_active' => true]);
        Official::factory()->create(['is_active' => false]);

        $this->assertSame([$active->id], Official::active()->pluck('id')->all());
    }

    #[Test]
    public function expired_term_scope_only_includes_active_terms_before_today(): void
    {
        $expired = Official::factory()->create([
            'is_active' => true,
            'term_ends_at' => today()->subDay(),
        ]);
        Official::factory()->create([
            'is_active' => false,
            'term_ends_at' => today()->subDay(),
        ]);
        Official::factory()->create([
            'is_active' => true,
            'term_ends_at' => today(),
        ]);
        Official::factory()->create([
            'is_active' => true,
            'term_ends_at' => null,
        ]);

        $this->assertSame([$expired->id], Official::termExpired()->pluck('id')->all());
    }

    #[Test]
    public function term_ending_within_scope_includes_today_through_limit_and_active_only(): void
    {
        $today = Official::factory()->create([
            'is_active' => true,
            'term_ends_at' => today(),
        ]);
        $within = Official::factory()->create([
            'is_active' => true,
            'term_ends_at' => today()->addDays(30),
        ]);
        Official::factory()->create([
            'is_active' => true,
            'term_ends_at' => today()->addDays(31),
        ]);
        Official::factory()->create([
            'is_active' => false,
            'term_ends_at' => today()->addDays(5),
        ]);
        Official::factory()->create([
            'is_active' => true,
            'term_ends_at' => null,
        ]);

        $this->assertEqualsCanonicalizing(
            [$today->id, $within->id],
            Official::termEndingWithin(30)->pluck('id')->all(),
        );
    }

    #[Test]
    public function term_end_date_is_cast_to_date(): void
    {
        $official = Official::factory()->create([
            'term_ends_at' => today()->addDays(10),
        ])->fresh();

        $this->assertInstanceOf(Carbon::class, $official->term_ends_at);
        $this->assertSame(today()->addDays(10)->toDateString(), $official->term_ends_at->toDateString());
    }
}
