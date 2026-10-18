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
    public function term_end_date_is_cast_to_date(): void
    {
        $official = Official::factory()->create([
            'term_ends_at' => today()->addDays(10),
        ])->fresh();

        $this->assertInstanceOf(Carbon::class, $official->term_ends_at);
        $this->assertSame(today()->addDays(10)->toDateString(), $official->term_ends_at->toDateString());
    }
}
