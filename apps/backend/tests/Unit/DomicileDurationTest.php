<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Support\DomicileDuration;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Saran "lama berdomisili" untuk isian Pengantar SKCK.
 */
class DomicileDurationTest extends TestCase
{
    public function test_local_citizens_have_lived_here_since_birth(): void
    {
        $this->assertSame('Sejak lahir', DomicileDuration::hint(new Citizen(['residency_type' => 'lokal'])));
    }

    public function test_newcomers_count_from_when_they_were_recorded_in_the_village(): void
    {
        $now = Carbon::parse('2026-11-18');
        $since = fn (string $date): Citizen => tap(new Citizen(['residency_type' => 'pendatang']), fn (Citizen $citizen) => $citizen->created_at = Carbon::parse($date));

        $this->assertSame('3 tahun', DomicileDuration::hint($since('2023-06-01'), $now));
        $this->assertSame('5 bulan', DomicileDuration::hint($since('2026-06-10'), $now));
        $this->assertSame('Kurang dari 1 bulan', DomicileDuration::hint($since('2026-11-01'), $now));
    }
}
