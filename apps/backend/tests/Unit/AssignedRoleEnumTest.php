<?php

namespace Tests\Unit;

use App\Enums\AssignedRole;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

class AssignedRoleEnumTest extends TestCase
{
    #[Test]
    public function it_no_longer_has_rw_case(): void
    {
        $caseNames = array_map(fn (AssignedRole $c) => $c->name, AssignedRole::cases());

        $this->assertNotContains('Rw', $caseNames);
    }

    #[Test]
    public function it_has_exactly_two_cases_matching_final_step_approvers(): void
    {
        $this->assertCount(2, AssignedRole::cases());
    }

    #[Test]
    public function it_has_kasi_pelayanan_case_with_correct_value(): void
    {
        $this->assertSame('kasi_pelayanan', AssignedRole::KasiPelayanan->value);
    }

    #[Test]
    public function it_has_kaur_tu_umum_case_with_correct_value(): void
    {
        $this->assertSame('kaur_tu_umum', AssignedRole::KaurTuUmum->value);
    }

    #[Test]
    public function it_can_be_constructed_from_string_value(): void
    {
        $this->assertSame(AssignedRole::KasiPelayanan, AssignedRole::from('kasi_pelayanan'));
        $this->assertSame(AssignedRole::KaurTuUmum, AssignedRole::from('kaur_tu_umum'));
    }

    #[Test]
    public function constructing_from_rw_throws(): void
    {
        $this->expectException(\ValueError::class);
        AssignedRole::from('rw');
    }

    #[Test]
    public function every_case_has_a_non_empty_label(): void
    {
        foreach (AssignedRole::cases() as $case) {
            $this->assertNotEmpty($case->label());
        }
    }
}
